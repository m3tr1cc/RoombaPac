import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createMaze } from '../src/game/maze'
import { calculateScore } from '../src/game/scoring'
import { getDatabase, hashPrivate, normalizeNickname, validToken } from '../src/server/db'

const integer = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const body = request.body ?? {}
  const nickname = normalizeNickname(body.nickname)
  if (!nickname) return response.status(400).json({ error: 'Use 3–20 letters, numbers, spaces, underscores, or hyphens.' })
  if (!validToken(body.playerToken) || typeof body.runId !== 'string') return response.status(400).json({ error: 'Invalid run identity' })
  if (![body.score, body.level, body.dots, body.items, body.pets, body.durationMs].every(integer) || body.level < 1) return response.status(400).json({ error: 'Invalid run statistics' })
  if (body.score !== calculateScore({ dots: body.dots, items: body.items, pets: body.pets })) return response.status(422).json({ error: 'Score verification failed' })
  try {
    const database = getDatabase()
    const playerHash = hashPrivate(body.playerToken)
    const { data: session, error: sessionError } = await database.from('roombapac_run_sessions').select('id,player_hash,seed,expires_at,completed_at').eq('id', body.runId).maybeSingle()
    if (sessionError) throw sessionError
    if (!session || session.player_hash !== playerHash) return response.status(404).json({ error: 'Run session not found' })
    if (session.completed_at) return response.status(409).json({ error: 'This run has already been submitted' })
    if (new Date(session.expires_at).getTime() < Date.now()) return response.status(410).json({ error: 'This run has expired' })
    let maximumDots = 0
    for (let level = 1; level <= body.level; level += 1) maximumDots += createMaze(Number(session.seed), level).pellets.size
    if (body.dots > maximumDots || body.items > body.level * 4 || body.pets > Math.max(1, body.items) * 10) return response.status(422).json({ error: 'Run totals exceed the generated rooms' })
    if (body.durationMs < body.dots * 25 || body.durationMs > 6 * 60 * 60 * 1000) return response.status(422).json({ error: 'Run timing is not plausible' })
    const { data, error } = await database.rpc('submit_roombapac_run', {
      p_session_id: body.runId, p_player_hash: playerHash, p_nickname: nickname, p_score: body.score,
      p_level: body.level, p_dots: body.dots, p_items: body.items, p_pets: body.pets, p_duration_ms: body.durationMs,
    }).single()
    if (error) throw error
    return response.status(200).json(data)
  } catch (error) {
    console.error('run-complete', error)
    return response.status(503).json({ error: 'Could not save this run' })
  }
}

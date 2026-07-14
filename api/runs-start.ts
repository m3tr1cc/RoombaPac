import { randomInt, randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, getDatabase, hashPrivate, validToken } from '../src/server/db'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  if (!validToken(request.body?.playerToken)) return response.status(400).json({ error: 'Invalid player token' })
  try {
    const database = getDatabase()
    const runId = randomUUID()
    const seed = randomInt(1, 2_147_483_647)
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 6 * 60 * 60 * 1000)
    const playerHash = hashPrivate(request.body.playerToken)
    const ipHash = hashPrivate(getClientIp(request))
    const cutoff = new Date(Date.now() - 60_000).toISOString()
    const { count } = await database.from('roombapac_run_sessions').select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', cutoff)
    if ((count ?? 0) >= 12) return response.status(429).json({ error: 'Too many runs started. Try again shortly.' })
    const { error } = await database.from('roombapac_run_sessions').insert({ id: runId, player_hash: playerHash, ip_hash: ipHash, seed, expires_at: expiresAt.toISOString() })
    if (error) throw error
    response.setHeader('cache-control', 'no-store')
    return response.status(201).json({ runId, seed, issuedAt: issuedAt.toISOString() })
  } catch (error) {
    console.error('run-start', error)
    return response.status(503).json({ error: 'Ranked play is temporarily unavailable' })
  }
}

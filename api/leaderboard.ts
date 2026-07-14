import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase, hashPrivate, validToken } from '../src/server/db.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const database = getDatabase()
    const token = request.headers['x-player-token']
    const playerHash = validToken(token) ? hashPrivate(token) : null
    const { data, error } = await database.from('roombapac_players').select('player_hash,nickname,best_score,best_level,best_achieved_at').gt('best_score', 0)
      .order('best_score', { ascending: false }).order('best_level', { ascending: false }).order('best_achieved_at', { ascending: true }).limit(1000)
    if (error) throw error
    const ranked = (data ?? []).map((row, index) => ({ rank: index + 1, nickname: row.nickname, score: Number(row.best_score), level: row.best_level, achievedAt: row.best_achieved_at, playerHash: row.player_hash }))
    const clean = (entry: typeof ranked[number]) => ({ rank: entry.rank, nickname: entry.nickname, score: entry.score, level: entry.level, achievedAt: entry.achievedAt })
    const player = playerHash ? ranked.find((entry) => entry.playerHash === playerHash) : null
    response.setHeader('cache-control', 'private, no-store')
    return response.status(200).json({ entries: ranked.slice(0, 25).map(clean), playerBest: player ? clean(player) : null })
  } catch (error) {
    console.error('leaderboard', error)
    return response.status(503).json({ error: 'Leaderboard unavailable' })
  }
}

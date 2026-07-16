import { CURRENT_MAZE_VERSION, type MazeVersion } from './maze'

export type LeaderboardEntry = { rank: number; nickname: string; score: number; level: number; achievedAt: string }
export type LeaderboardResponse = { entries: LeaderboardEntry[]; playerBest: LeaderboardEntry | null }
export type RunTicket = { runId: string; seed: number; issuedAt: string; mazeVersion: MazeVersion; ranked: boolean }

const TOKEN_KEY = 'roombapac-player-token'
const NAME_KEY = 'roombapac-nickname'

export function getPlayerToken() {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID() + crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export const getSavedNickname = () => localStorage.getItem(NAME_KEY) ?? ''

export async function startRankedRun(): Promise<RunTicket> {
  try {
    const response = await fetch('/api/runs-start', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playerToken: getPlayerToken(), mazeVersion: CURRENT_MAZE_VERSION }),
    })
    if (!response.ok) throw new Error('Run service unavailable')
    return { ...(await response.json()), ranked: true }
  } catch {
    return { runId: crypto.randomUUID(), seed: crypto.getRandomValues(new Uint32Array(1))[0], issuedAt: new Date().toISOString(), mazeVersion: CURRENT_MAZE_VERSION, ranked: false }
  }
}

export async function submitRun(input: {
  ticket: RunTicket; nickname: string; score: number; level: number; dots: number; items: number; pets: number; durationMs: number
}) {
  const nickname = input.nickname.trim()
  const response = await fetch('/api/runs-complete', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, nickname, playerToken: getPlayerToken(), runId: input.ticket.runId }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'Could not save this run')
  localStorage.setItem(NAME_KEY, nickname)
  return response.json() as Promise<{ rank: number; bestScore: number }>
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const response = await fetch('/api/leaderboard', { headers: { 'x-player-token': getPlayerToken() } })
  if (!response.ok) throw new Error('Leaderboard unavailable')
  return response.json()
}

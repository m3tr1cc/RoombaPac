import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export function getDatabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Leaderboard service is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function hashPrivate(value: string) {
  const pepper = process.env.PLAYER_TOKEN_PEPPER
  if (!pepper) throw new Error('Leaderboard service is not configured')
  return createHmac('sha256', pepper).update(value).digest('hex')
}

export function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 48 && value.length <= 160 && /^[a-zA-Z0-9-]+$/.test(value)
}

const blocked = ['fuck', 'shit', 'nigger', 'nazi']
export function normalizeNickname(value: unknown) {
  if (typeof value !== 'string') return null
  const nickname = value.trim().replace(/\s+/g, ' ')
  if (!/^[A-Za-z0-9 _-]{3,20}$/.test(nickname)) return null
  if (blocked.some((word) => nickname.toLowerCase().includes(word))) return null
  return nickname
}

export function getClientIp(request: { headers: Record<string, string | string[] | undefined> }) {
  const forwarded = request.headers['x-forwarded-for']
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || 'unknown'
}

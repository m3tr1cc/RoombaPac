import { Crown, X } from '@phosphor-icons/react'
import type { LeaderboardResponse } from '../game/leaderboard'

type LeaderboardDialogProps = { data: LeaderboardResponse | null; error: string; loading: boolean; onClose: () => void }

export function LeaderboardDialog({ data, error, loading, onClose }: LeaderboardDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog leaderboard-dialog" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close leaderboard"><X weight="bold" /></button>
        <Crown className="dialog-icon" weight="fill" aria-hidden />
        <p className="eyebrow">Global cleaners</p>
        <h2 id="leaderboard-title">Top scores</h2>
        {loading && <p className="dialog-status">Polishing the leaderboard…</p>}
        {error && <p className="dialog-error">{error}</p>}
        {data && data.entries.length === 0 && <p className="dialog-status">No scores yet. Be the first cleaner on the board.</p>}
        {data && data.entries.length > 0 && (
          <ol className="leaderboard-list">
            {data.entries.map((entry) => (
              <li key={`${entry.rank}-${entry.nickname}`} className={data.playerBest?.rank === entry.rank ? 'is-player' : ''}>
                <span className="rank">{entry.rank}</span><span className="name">{entry.nickname}</span>
                <span className="level">LV {entry.level}</span><strong>{entry.score.toLocaleString()}</strong>
              </li>
            ))}
          </ol>
        )}
        {data?.playerBest && data.playerBest.rank > 25 && <p className="player-rank">Your best: #{data.playerBest.rank} · {data.playerBest.score.toLocaleString()}</p>}
      </section>
    </div>
  )
}

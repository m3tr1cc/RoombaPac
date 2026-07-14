import { useState, type FormEvent } from 'react'
import { getSavedNickname } from '../game/leaderboard'

type NameDialogProps = { score: number; submitting: boolean; error: string; onSubmit: (nickname: string) => void; onSkip: () => void }

export function NameDialog({ score, submitting, error, onSubmit, onSkip }: NameDialogProps) {
  const [nickname, setNickname] = useState(getSavedNickname())
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(nickname) }
  return (
    <div className="dialog-backdrop">
      <form className="dialog name-dialog" role="dialog" aria-modal="true" aria-labelledby="name-title" onSubmit={submit}>
        <p className="eyebrow">Cleaning complete</p>
        <h2 id="name-title">Score: {score.toLocaleString()}</h2>
        <p>Leave your nickname on the global board.</p>
        <label htmlFor="nickname">Nickname</label>
        <input id="nickname" autoFocus value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9 _-]{3,20}" placeholder="DustBuster" />
        {error && <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onSkip}>Skip</button>
          <button type="submit" className="button primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save score'}</button>
        </div>
      </form>
    </div>
  )
}

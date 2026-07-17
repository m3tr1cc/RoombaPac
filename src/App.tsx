import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowsClockwise, Pause, Play, SpeakerHigh, SpeakerSlash, Trophy } from '@phosphor-icons/react'
import './App.css'
import { GameCanvas, type GameCanvasHandle } from './components/GameCanvas'
import { LeaderboardDialog } from './components/LeaderboardDialog'
import { NameDialog } from './components/NameDialog'
import { ArcadeAudio } from './game/audio'
import { fetchLeaderboard, startRankedRun, submitRun, type LeaderboardResponse, type RunTicket } from './game/leaderboard'
import type { Direction, GameSnapshot } from './game/types'

const INITIAL: GameSnapshot = { mode: 'idle', score: 0, level: 1, lives: 3, dots: 0, items: 0, pets: 0, activeMs: 0 }

function App() {
  const gameRef = useRef<GameCanvasHandle>(null)
  const audio = useMemo(() => new ArcadeAudio(), [])
  const [snapshot, setSnapshot] = useState(INITIAL)
  const [ticket, setTicket] = useState<RunTicket | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [restartAfterLeaderboard, setRestartAfterLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [leaderboardError, setLeaderboardError] = useState('')
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showName, setShowName] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [muted, setMuted] = useState(audio.isMuted)

  const onSnapshot = useCallback((next: GameSnapshot) => {
    setSnapshot(next)
    if (next.mode === 'game-over') setShowName(true)
  }, [])

  const start = async () => {
    setShowName(false); setSubmitError('')
    // Audio activation is kicked off by the user gesture but must not block the
    // run if a browser keeps its AudioContext suspended (common in embeds).
    void audio.start()
    const nextTicket = await startRankedRun()
    setTicket(nextTicket)
    gameRef.current?.start(nextTicket.seed, nextTicket.mazeVersion)
  }

  const openLeaderboard = async (restartOnClose = false) => {
    setRestartAfterLeaderboard(restartOnClose)
    setShowLeaderboard(true); setLeaderboardLoading(true); setLeaderboardError('')
    try { setLeaderboard(await fetchLeaderboard()) }
    catch (error) { setLeaderboardError(error instanceof Error ? error.message : 'Leaderboard unavailable') }
    finally { setLeaderboardLoading(false) }
  }

  const closeLeaderboard = () => {
    setShowLeaderboard(false)
    setRestartAfterLeaderboard(false)
    if (restartAfterLeaderboard) void start()
  }

  const saveScore = async (nickname: string) => {
    if (!ticket?.ranked) { setSubmitError('This run started offline and cannot be ranked.'); return }
    setSubmitting(true); setSubmitError('')
    try {
      await submitRun({ ticket, nickname, score: snapshot.score, level: snapshot.level, dots: snapshot.dots, items: snapshot.items, pets: snapshot.pets, durationMs: Math.round(snapshot.activeMs) })
      setShowName(false)
      await openLeaderboard(true)
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Could not save this run') }
    finally { setSubmitting(false) }
  }

  const reset = () => { setConfirmReset(false); setShowName(false); setTicket(null); gameRef.current?.reset(); audio.suspend() }
  const toggleMute = () => { const next = !muted; audio.setMuted(next); setMuted(next) }
  const togglePause = () => { gameRef.current?.togglePause(); if (snapshot.mode === 'paused') audio.resume(); else audio.suspend() }
  const move = (direction: Direction) => gameRef.current?.direction(direction)
  const isActive = !['idle', 'game-over'].includes(snapshot.mode)

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="RoombaPac endless arcade game">
        <GameCanvas ref={gameRef} onSnapshot={onSnapshot} onSound={(sound) => audio.play(sound)} />
        <header className="hud">
          <div className="brand-lockup"><span className="brand-dot" />ROOMBAPAC</div>
          <dl className="stats" aria-live="polite">
            <div><dt>Score</dt><dd>{snapshot.score.toLocaleString()}</dd></div>
            <div><dt>Level</dt><dd>{snapshot.level}</dd></div>
            <div><dt>Lives</dt><dd>{'●'.repeat(snapshot.lives)}<span className="sr-only">{snapshot.lives}</span></dd></div>
          </dl>
          <div className="hud-actions">
            <button className="icon-button" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? <SpeakerSlash /> : <SpeakerHigh />}</button>
            <button className="icon-button" onClick={togglePause} disabled={!isActive || snapshot.mode === 'life-lost' || snapshot.mode === 'level-clear'} aria-label={snapshot.mode === 'paused' ? 'Resume game' : 'Pause game'}>{snapshot.mode === 'paused' ? <Play weight="fill" /> : <Pause weight="fill" />}</button>
            <button className="icon-button" onClick={() => setConfirmReset(true)} disabled={!isActive} aria-label="Reset game"><ArrowsClockwise weight="bold" /></button>
          </div>
        </header>

        {snapshot.mode === 'idle' && (
          <div className="idle-overlay">
            <div className="idle-card">
              <div className="roomba-mark"><span /></div>
              <p className="eyebrow">An endless cleaning chase</p>
              <h1>RoombaPac</h1>
              <p className="lede">Vacuum every crumb. Find lost treasures. Outsmart the household pets.</p>
              <div className="idle-actions">
                <button className="button primary" onClick={() => void start()}><Play weight="fill" /> Start Game</button>
                <button className="button secondary" onClick={() => void openLeaderboard()}><Trophy weight="fill" /> Leaderboard</button>
              </div>
              <p className="controls-hint"><kbd>WASD</kbd> or <kbd>ARROWS</kbd> to move · <kbd>SPACE</kbd> to pause</p>
            </div>
          </div>
        )}

        {snapshot.mode === 'paused' && <button className="pause-overlay" onClick={togglePause}><Play weight="fill" /><strong>Paused</strong><span>Press space or tap to keep cleaning</span></button>}
        {snapshot.mode === 'life-lost' && <div className="status-banner"><strong>Pet collision!</strong><span>{snapshot.lives ? `${snapshot.lives} lives left` : 'Game over'}</span></div>}
        {snapshot.mode === 'level-clear' && <div className="status-banner success"><strong>Room spotless!</strong><span>Preparing level {snapshot.level + 1}</span></div>}

        <div className="touch-pad" aria-label="Touch movement controls">
          <button onPointerDown={() => move('up')} aria-label="Move up"><ArrowUp weight="bold" /></button>
          <button onPointerDown={() => move('left')} aria-label="Move left"><ArrowLeft weight="bold" /></button>
          <span />
          <button onPointerDown={() => move('right')} aria-label="Move right"><ArrowRight weight="bold" /></button>
          <button onPointerDown={() => move('down')} aria-label="Move down"><ArrowDown weight="bold" /></button>
        </div>
      </section>

      {showLeaderboard && <LeaderboardDialog data={leaderboard} error={leaderboardError} loading={leaderboardLoading} onClose={closeLeaderboard} />}
      {showName && <NameDialog score={snapshot.score} submitting={submitting} error={submitError} onSubmit={(name) => void saveScore(name)} onSkip={() => void start()} />}
      {confirmReset && (
        <div className="dialog-backdrop">
          <section className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
            <p className="eyebrow">Hold up</p><h2 id="reset-title">Reset this run?</h2>
            <p>Your current score and level will be lost. Global leaderboard scores stay safe.</p>
            <div className="dialog-actions"><button className="button secondary" onClick={() => setConfirmReset(false)}>Keep playing</button><button className="button danger" onClick={reset}>Reset run</button></div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App

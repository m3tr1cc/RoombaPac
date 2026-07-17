import { forwardRef, useImperativeHandle } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSnapshot } from './game/types'
import App from './App'

const mocks = vi.hoisted(() => ({
  fetchLeaderboard: vi.fn(),
  gameStart: vi.fn(),
  startRankedRun: vi.fn(),
  submitRun: vi.fn(),
}))

let emitSnapshot: ((snapshot: GameSnapshot) => void) | undefined

vi.mock('./components/GameCanvas', () => ({
  GameCanvas: forwardRef(function MockGameCanvas(
    { onSnapshot }: { onSnapshot: (snapshot: GameSnapshot) => void },
    ref,
  ) {
    emitSnapshot = onSnapshot
    useImperativeHandle(ref, () => ({
      direction: vi.fn(),
      pause: vi.fn(),
      reset: vi.fn(),
      start: mocks.gameStart,
      togglePause: vi.fn(),
    }))
    return <canvas aria-label="RoombaPac game board" />
  }),
}))

vi.mock('./game/audio', () => ({
  ArcadeAudio: class MockArcadeAudio {
    isMuted = false
    play() {}
    resume() {}
    setMuted() {}
    start() { return Promise.resolve() }
    suspend() {}
  },
}))

vi.mock('./game/leaderboard', () => ({
  fetchLeaderboard: mocks.fetchLeaderboard,
  getSavedNickname: () => '',
  startRankedRun: mocks.startRankedRun,
  submitRun: mocks.submitRun,
}))

const firstTicket = { runId: 'run-1', seed: 101, issuedAt: '2026-07-16T00:00:00.000Z', mazeVersion: 2, ranked: true }
const secondTicket = { runId: 'run-2', seed: 202, issuedAt: '2026-07-16T00:01:00.000Z', mazeVersion: 2, ranked: true }
const gameOver: GameSnapshot = { mode: 'game-over', score: 2_300, level: 2, lives: 0, dots: 3, items: 0, pets: 1, activeMs: 12_500 }

async function beginAndFinishRun() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))
  await waitFor(() => expect(mocks.gameStart).toHaveBeenCalledWith(firstTicket.seed, firstTicket.mazeVersion))
  act(() => emitSnapshot?.(gameOver))
  expect(screen.getByRole('heading', { name: 'Score: 2,300' })).toBeInTheDocument()
}

describe('post-game restart flow', () => {
  afterEach(cleanup)

  beforeEach(() => {
    emitSnapshot = undefined
    mocks.fetchLeaderboard.mockReset().mockResolvedValue({ entries: [], playerBest: null })
    mocks.gameStart.mockReset()
    mocks.startRankedRun.mockReset()
      .mockResolvedValueOnce(firstTicket)
      .mockResolvedValueOnce(secondTicket)
    mocks.submitRun.mockReset().mockResolvedValue({ rank: 1, bestScore: gameOver.score })
  })

  it('starts a fresh run immediately when the player skips saving', async () => {
    render(<App />)
    await beginAndFinishRun()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    await waitFor(() => expect(mocks.gameStart).toHaveBeenCalledWith(secondTicket.seed, secondTicket.mazeVersion))
    expect(mocks.startRankedRun).toHaveBeenCalledTimes(2)
  })

  it('waits to restart a saved run until the post-game leaderboard closes', async () => {
    render(<App />)
    await beginAndFinishRun()

    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'DustBuster' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save score' }))

    expect(await screen.findByRole('heading', { name: 'Top scores' })).toBeInTheDocument()
    expect(mocks.submitRun).toHaveBeenCalledTimes(1)
    expect(mocks.gameStart).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close leaderboard' }))

    await waitFor(() => expect(mocks.gameStart).toHaveBeenCalledWith(secondTicket.seed, secondTicket.mazeVersion))
    expect(mocks.startRankedRun).toHaveBeenCalledTimes(2)
  })

  it('does not start a run after closing the title-screen leaderboard', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }))
    expect(await screen.findByRole('heading', { name: 'Top scores' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close leaderboard' }))

    expect(mocks.startRankedRun).not.toHaveBeenCalled()
    expect(mocks.gameStart).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument()
  })

  it('keeps the score prompt open and does not restart after a failed submission', async () => {
    mocks.submitRun.mockRejectedValueOnce(new Error('Could not save this run'))
    render(<App />)
    await beginAndFinishRun()

    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'DustBuster' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save score' }))

    expect(await screen.findByText('Could not save this run')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Score: 2,300' })).toBeInTheDocument()
    expect(mocks.startRankedRun).toHaveBeenCalledTimes(1)
    expect(mocks.gameStart).toHaveBeenCalledTimes(1)
  })
})

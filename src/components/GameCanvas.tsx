import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { GameEngine } from '../game/engine'
import type { Sound } from '../game/audio'
import type { Direction, GameSnapshot } from '../game/types'

export type GameCanvasHandle = {
  start: (seed: number) => void
  reset: () => void
  togglePause: () => void
  pause: () => void
  direction: (direction: Direction) => void
}

type GameCanvasProps = {
  onSnapshot: (snapshot: GameSnapshot) => void
  onSound: (sound: Sound) => void
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas({ onSnapshot, onSound }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const handlersRef = useRef({ onSnapshot, onSound })
  handlersRef.current = { onSnapshot, onSound }

  if (!engineRef.current) {
    engineRef.current = new GameEngine({
      onSnapshot: (snapshot) => handlersRef.current.onSnapshot(snapshot),
      onSound: (sound) => handlersRef.current.onSound(sound),
    })
  }

  useImperativeHandle(ref, () => ({
    start: (seed) => engineRef.current?.start(seed),
    reset: () => engineRef.current?.reset(),
    togglePause: () => engineRef.current?.togglePause(),
    pause: () => engineRef.current?.pause(),
    direction: (direction) => engineRef.current?.setDirection(direction),
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine) return
    const context = canvas.getContext('2d')
    if (!context) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = (now - previous) / 1000
      previous = now
      engine.update(dt, now)
      engine.render(context, canvas.width, canvas.height, now)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const direction: Record<string, Direction | undefined> = {
        ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right',
        ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left',
      }
      if (direction[event.key]) { event.preventDefault(); engineRef.current?.setDirection(direction[event.key]!) }
      if (event.code === 'Space') { event.preventDefault(); engineRef.current?.togglePause() }
    }
    const onVisibility = () => { if (document.hidden) engineRef.current?.pause() }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('keydown', onKeyDown); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  return <canvas ref={canvasRef} className="game-canvas" aria-label="RoombaPac game board" />
})

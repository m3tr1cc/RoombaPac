import { describe, expect, it, vi } from 'vitest'
import { GameEngine } from './engine'

describe('maze topology integration', () => {
  it('moves the Roomba through matched wrap tunnels', () => {
    const engine = new GameEngine({ onSnapshot: vi.fn(), onSound: vi.fn() })
    engine.start(1234)
    const tunnel = engine.maze.tunnels[0]
    engine.roomba = { ...tunnel.left, direction: 'left', nextDirection: 'left', progress: 0 }

    for (let step = 0; step < 5; step += 1) engine.update(0.05, 1_000 + step * 50)

    expect(engine.roomba.x).toBe(tunnel.right.x)
    expect(engine.roomba.direction).toBe('left')
  })

  it('keeps the player outside the pet-cage interior', () => {
    const engine = new GameEngine({ onSnapshot: vi.fn(), onSound: vi.fn() })
    engine.start(1234)
    engine.roomba = { x: 13, y: 9, direction: 'up', nextDirection: 'up', progress: 0 }

    engine.update(0.05, 1_000)

    expect(engine.roomba).toMatchObject({ x: 13, y: 9, progress: 0 })
  })

  it('uses and retains the requested maze version through level changes', () => {
    const engine = new GameEngine({ onSnapshot: vi.fn(), onSound: vi.fn() })
    engine.start(1234, 1)
    expect(engine.maze).toMatchObject({ width: 31, height: 17 })
    engine.maze.pellets.clear()
    engine.maze.items.clear()
    engine.update(0.016, 1_000)
    engine.update(0.016, 2_300)
    expect(engine.maze).toMatchObject({ width: 31, height: 17 })
  })

  it('advances into a different deterministic procedural room', () => {
    const engine = new GameEngine({ onSnapshot: vi.fn(), onSound: vi.fn() })
    engine.start(1234)
    const firstRoom = engine.maze.cells.map((row) => [...row])
    engine.maze.pellets.clear()
    engine.maze.items.clear()

    engine.update(0.016, 1_000)
    expect(engine.mode).toBe('level-clear')
    engine.update(0.016, 2_300)

    expect(engine.level).toBe(2)
    expect(engine.maze.cells).not.toEqual(firstRoom)
    expect(engine.mode).toBe('playing')
  })
})

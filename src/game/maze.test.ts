import { describe, expect, it } from 'vitest'
import { availableDirections, COMPACT_OBSTACLE_QUOTAS, createMaze, CURRENT_MAZE_VERSION, furnitureCells, LEGACY_MAZE_VERSION, MAZE_HEIGHT, MAZE_WIDTH, neighborPoint, reachableCount } from './maze'
import { pointKey, type ObstacleCategory } from './types'

const insidePen = (x: number, y: number) => x >= 11 && x <= 15 && y >= 6 && y <= 8

describe('Pac-Man-style furniture mazes', () => {
  it('keeps the annotated level-one blueprint fixed across run seeds', () => {
    const first = createMaze(1, 1)
    const second = createMaze(4_242_424, 1)
    expect(first.cells).toEqual(second.cells)
    expect(first.furniture).toEqual(second.furniture)
    expect(first).toMatchObject({ width: MAZE_WIDTH, height: MAZE_HEIGHT, spawn: { x: 13, y: 13 }, pen: { x: 13, y: 7 } })
    expect(first.tunnels).toEqual([{ left: { x: 0, y: 7 }, right: { x: 26, y: 7 } }])
    expect(first.pellets.size).toBeGreaterThanOrEqual(170)
    expect(first.pellets.size).toBeLessThanOrEqual(180)
    expect(new Set(first.furniture.map((piece) => piece.category))).toEqual(new Set<ObstacleCategory>([1, 2, 3, 5, 6, 7, 8, 9]))
  })

  it('retains the legacy board for ranked runs started by version-one clients', () => {
    const legacy = createMaze(1, 1, LEGACY_MAZE_VERSION)
    expect(legacy).toMatchObject({ width: 31, height: 17, spawn: { x: 15, y: 15 }, pen: { x: 15, y: 8 } })
    expect(legacy.tunnels).toEqual([{ left: { x: 0, y: 8 }, right: { x: 30, y: 8 } }])
    expect(legacy.pellets.size).toBe(277)
    expect(CURRENT_MAZE_VERSION).toBe(2)
  })

  it('is deterministic for the same run seed and level', () => {
    const first = createMaze(4242, 7)
    const second = createMaze(4242, 7)
    expect(first.cells).toEqual(second.cells)
    expect(first.furniture).toEqual(second.furniture)
    expect([...first.items]).toEqual([...second.items])
    expect(first.tunnels).toEqual(second.tunnels)
  })

  it.each([1, 2, 8, 25])('keeps every floor and collectible reachable for level %i', (level) => {
    const maze = createMaze(987654, level)
    const walkable = maze.cells.flat().filter((cell) => cell === 0).length
    expect(reachableCount(maze)).toBe(walkable)
    expect(maze.items.size).toBe(4)
    expect(maze.pellets.size).toBeGreaterThanOrEqual(170)
    expect(maze.pellets.size).toBeLessThanOrEqual(180)
    for (const key of [...maze.pellets, ...maze.items]) {
      const [x, y] = key.split(',').map(Number)
      expect(maze.cells[y][x]).toBe(0)
    }
  })

  it.each([1, 2, 3, 8, 25])('builds symmetric connected routes without dead ends for level %i', (level) => {
    const maze = createMaze(987654, level)
    for (let y = 0; y < maze.height; y += 1) {
      expect(maze.cells[y]).toEqual([...maze.cells[y]].reverse())
      for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0 && !insidePen(x, y)) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('uses the rounded obstacle quota on fixed and procedural rooms', () => {
    for (const maze of [createMaze(1, 1), createMaze(4_242, 2), createMaze(9_731, 17)]) {
      const counts = { room: 0, linear: 0, junction: 0, hybrid: 0, corner: 0, block: 0 }
      for (const piece of maze.furniture) {
        if (piece.kind === 'room') counts.room += 1
        else if (piece.kind === 'straight' || piece.kind === 'stub') counts.linear += 1
        else if (piece.kind === 'junction') counts.junction += 1
        else if (piece.kind === 'alcove') counts.hybrid += 1
        else if (piece.kind === 'corner') counts.corner += 1
        else if (piece.kind === 'block') counts.block += 1
      }
      expect(counts).toEqual(COMPACT_OBSTACLE_QUOTAS)
    }
  })

  it('maps every collision wall into category-aware furniture metadata', () => {
    const maze = createMaze(2026, 6)
    const occupied = new Set(maze.furniture.flatMap(furnitureCells).map(pointKey))
    for (let y = 0; y < maze.height; y += 1) for (let x = 0; x < maze.width; x += 1) {
      if (maze.cells[y][x] === 1) expect(occupied.has(pointKey({ x, y }))).toBe(true)
    }
    for (const piece of maze.furniture) {
      expect(piece.category).toBeGreaterThanOrEqual(1)
      expect(piece.category).toBeLessThanOrEqual(9)
      furnitureCells(piece).forEach(({ x, y }) => expect(maze.cells[y][x]).toBe(1))
    }
  })

  it('wraps both directions through matched side tunnels', () => {
    const maze = createMaze(17, 2)
    const tunnel = maze.tunnels[0]
    expect(neighborPoint(maze, tunnel.left, 'left')).toEqual(tunnel.right)
    expect(neighborPoint(maze, tunnel.right, 'right')).toEqual(tunnel.left)
    expect(availableDirections(maze, tunnel.left)).toContain('left')
    expect(availableDirections(maze, tunnel.right)).toContain('right')
  })

  it('varies procedural rooms and rotates all nine themes', () => {
    expect(createMaze(111, 4).cells).not.toEqual(createMaze(222, 4).cells)
    expect(Array.from({ length: 10 }, (_, index) => createMaze(1, index + 1).theme)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 0])
  })

  it('preserves production invariants across a broad deterministic sample', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const maze = createMaze(seed * 7_919, (seed % 30) + 2)
      expect(reachableCount(maze)).toBe(maze.cells.flat().filter((cell) => cell === 0).length)
      expect(maze.items.size).toBe(4)
      expect(maze.pellets.size).toBeGreaterThanOrEqual(170)
      expect(maze.pellets.size).toBeLessThanOrEqual(180)
      for (let y = 0; y < maze.height; y += 1) for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0 && !insidePen(x, y)) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

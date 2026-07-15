import { describe, expect, it } from 'vitest'
import { availableDirections, createMaze, furnitureCells, neighborPoint, reachableCount } from './maze'
import { pointKey, type ObstacleCategory } from './types'

const insidePen = (x: number, y: number) => x >= 13 && x <= 17 && y >= 7 && y <= 9

describe('Pac-Man-style furniture mazes', () => {
  it('keeps the annotated level-one blueprint fixed across run seeds', () => {
    const first = createMaze(1, 1)
    const second = createMaze(4_242_424, 1)
    expect(first.cells).toEqual(second.cells)
    expect(first.furniture).toEqual(second.furniture)
    expect(first.tunnels).toEqual([{ left: { x: 0, y: 8 }, right: { x: 30, y: 8 } }])
    expect(new Set(first.furniture.map((piece) => piece.category))).toEqual(new Set<ObstacleCategory>([1, 2, 3, 4, 5, 6, 7, 8, 9]))
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
    expect(maze.pellets.size).toBeGreaterThan(180)
    for (const key of [...maze.pellets, ...maze.items]) {
      const [x, y] = key.split(',').map(Number)
      expect(maze.cells[y][x]).toBe(0)
    }
  })

  it.each([1, 2, 3, 8, 25])('builds symmetric single-lane loop networks for level %i', (level) => {
    const maze = createMaze(987654, level)
    for (let y = 0; y < maze.height; y += 1) {
      expect(maze.cells[y]).toEqual([...maze.cells[y]].reverse())
      for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0 && !insidePen(x, y)) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
        if (x < maze.width - 1 && y < maze.height - 1 && !insidePen(x, y)) {
          const openSquare = maze.cells[y][x] === 0 && maze.cells[y][x + 1] === 0 && maze.cells[y + 1][x] === 0 && maze.cells[y + 1][x + 1] === 0
          expect(openSquare).toBe(false)
        }
      }
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
      expect(maze.pellets.size).toBeGreaterThan(180)
      for (let y = 0; y < maze.height; y += 1) for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0 && !insidePen(x, y)) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

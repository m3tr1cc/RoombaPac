import { describe, expect, it } from 'vitest'
import { availableDirections, createMaze, furnitureCells, reachableCount } from './maze'

describe('procedural maze', () => {
  it('is deterministic for a seed and level', () => {
    expect(createMaze(4242, 7).cells).toEqual(createMaze(4242, 7).cells)
    expect([...createMaze(4242, 7).items]).toEqual([...createMaze(4242, 7).items])
  })

  it.each([1, 2, 8, 25])('keeps every walkable cell reachable for level %i', (level) => {
    const maze = createMaze(987654, level)
    const walkable = maze.cells.flat().filter((cell) => cell === 0).length
    expect(reachableCount(maze)).toBe(walkable)
    expect(maze.items.size).toBe(4)
    expect(maze.pellets.size).toBeGreaterThan(100)
  })

  it.each([1, 2, 3, 8, 25])('builds symmetric, loop-heavy arcade lanes for level %i', (level) => {
    const maze = createMaze(987654, level)
    for (let y = 0; y < maze.height; y += 1) {
      expect(maze.cells[y]).toEqual([...maze.cells[y]].reverse())
      for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('procedurally varies furniture while preserving the arcade structure', () => {
    const first = createMaze(111, 4)
    const second = createMaze(222, 4)
    expect(first.furniture).not.toEqual(second.furniture)
    expect(first.furniture.some((piece) => piece.kind === 'pen')).toBe(true)
  })

  it('uses collision-accurate I, L, and T furniture instead of rectangular stand-ins', () => {
    const maze = createMaze(2026, 6)
    expect(new Set(maze.furniture.map((piece) => piece.kind))).toEqual(new Set(['i', 'l', 't', 'pen']))
    for (const piece of maze.furniture.filter((item) => item.kind !== 'pen')) {
      const occupied = furnitureCells(piece)
      expect(occupied).toHaveLength(5)
      occupied.forEach(({ x, y }) => expect(maze.cells[y][x]).toBe(1))
      if (piece.kind !== 'i') expect(occupied.length).toBeLessThan(piece.width * piece.height)
    }
  })

  it('preserves connectivity and loops across randomized arrangements', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const maze = createMaze(seed * 7919, seed)
      const walkable = maze.cells.flat().filter((cell) => cell === 0).length
      expect(reachableCount(maze)).toBe(walkable)
      for (let y = 0; y < maze.height; y += 1) for (let x = 0; x < maze.width; x += 1) {
        if (maze.cells[y][x] === 0) expect(availableDirections(maze, { x, y }).length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('rotates through nine room themes', () => {
    expect(Array.from({ length: 10 }, (_, index) => createMaze(1, index + 1).theme)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 0])
  })
})

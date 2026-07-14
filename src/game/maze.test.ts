import { describe, expect, it } from 'vitest'
import { createMaze, reachableCount } from './maze'

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

  it('rotates through nine room themes', () => {
    expect(Array.from({ length: 10 }, (_, index) => createMaze(1, index + 1).theme)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 0])
  })
})

import { describe, expect, it } from 'vitest'
import { createMaze } from './maze'
import { furniturePlacementCells, planFurniturePlacements } from './furnitureLayout'
import { resolveFurnitureSprite } from './furnitureSprites'
import { pointKey, type FurniturePiece } from './types'

function piece(cells: Array<[number, number]>, kind: FurniturePiece['kind'] = 'junction'): FurniturePiece {
  const points = cells.map(([x, y]) => ({ x, y }))
  const xs = points.map(({ x }) => x), ys = points.map(({ y }) => y)
  return {
    id: 'fixture',
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
    kind,
    category: 3,
    cells: points,
    variant: 0,
  }
}

describe('footprint-aware furniture layout', () => {
  it('uses a multi-cell sprite when the obstacle shape supports one', () => {
    const placements = planFurniturePlacements(piece([[0, 0], [1, 0], [2, 0]]), 0)
    expect(placements).toHaveLength(1)
    expect(placements[0].cells).toHaveLength(3)
  })

  it('tiles every obstacle cell exactly once without spilling into hallways', () => {
    for (let level = 1; level <= 12; level += 1) {
      const maze = createMaze(9_731, level)
      for (const obstacle of maze.furniture.filter(({ kind }) => kind !== 'boundary' && kind !== 'pen')) {
        const expected = obstacle.cells.map(pointKey).sort()
        const actual = planFurniturePlacements(obstacle, maze.theme).flatMap(furniturePlacementCells).map(pointKey).sort()
        expect(actual).toEqual(expected)
        expect(new Set(actual).size).toBe(actual.length)
      }
    }
  })

  it('is deterministic and keeps every selected sprite collision eligible', () => {
    const maze = createMaze(42_424, 7)
    for (const obstacle of maze.furniture.filter(({ kind }) => kind !== 'boundary' && kind !== 'pen')) {
      const first = planFurniturePlacements(obstacle, maze.theme)
      expect(planFurniturePlacements(obstacle, maze.theme)).toEqual(first)
      first.forEach(({ spriteId }) => expect(resolveFurnitureSprite(spriteId).collisionEligible).toBe(true))
    }
  })

  it('keeps chairs from dominating representative maps', () => {
    const maps = [createMaze(1, 1)]
    for (let sample = 1; sample <= 20; sample += 1) maps.push(createMaze(sample * 7_919, (sample % 9) + 2))

    const selected = maps.flatMap((maze) => maze.furniture
      .filter(({ kind }) => kind !== 'boundary' && kind !== 'pen')
      .flatMap((obstacle) => planFurniturePlacements(obstacle, maze.theme)))
    const definitions = selected.map(({ spriteId }) => resolveFurnitureSprite(spriteId))
    const firstMap = maps[0].furniture
      .filter(({ kind }) => kind !== 'boundary' && kind !== 'pen')
      .flatMap((obstacle) => planFurniturePlacements(obstacle, maps[0].theme))
      .map(({ spriteId }) => resolveFurnitureSprite(spriteId))

    expect(new Set(firstMap.map(({ id }) => id)).size).toBeGreaterThanOrEqual(8)
    expect(new Set(firstMap.map(({ family }) => family)).size).toBeGreaterThanOrEqual(4)
    expect(definitions.filter(({ family }) => family === 'chair').length / definitions.length).toBeLessThan(0.3)
  })
})

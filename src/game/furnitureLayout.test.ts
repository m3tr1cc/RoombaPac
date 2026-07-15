import { describe, expect, it } from 'vitest'
import { createMaze } from './maze'
import { furnitureModuleCells, planFurnitureModules } from './furnitureLayout'
import { pointKey, type FurniturePiece } from './types'

function piece(cells: Array<[number, number]>, category: FurniturePiece['category'] = 3): FurniturePiece {
  const points = cells.map(([x, y]) => ({ x, y }))
  const xs = points.map(({ x }) => x), ys = points.map(({ y }) => y)
  return {
    id: 'fixture',
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
    kind: 'junction',
    category,
    cells: points,
    variant: 0,
  }
}

describe('furniture building-block layout', () => {
  it('composes a T obstacle from perpendicular furniture modules', () => {
    const tPiece = piece([[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]])
    const modules = planFurnitureModules(tPiece)
    expect(modules.some((module) => module.orientation === 'horizontal' && module.length === 3)).toBe(true)
    expect(modules.some((module) => module.orientation === 'vertical')).toBe(true)
  })

  it('tiles every obstacle cell exactly once without spilling into hallways', () => {
    for (let level = 1; level <= 12; level += 1) {
      const maze = createMaze(9_731, level)
      for (const obstacle of maze.furniture.filter(({ kind }) => kind !== 'boundary' && kind !== 'pen')) {
        const expected = obstacle.cells.map(pointKey).sort()
        const actual = planFurnitureModules(obstacle).flatMap(furnitureModuleCells).map(pointKey).sort()
        expect(actual).toEqual(expected)
      }
    }
  })

  it('uses full three-cell furniture on a three-cell run', () => {
    expect(planFurnitureModules(piece([[0, 0], [1, 0], [2, 0]], 1))).toEqual([
      expect.objectContaining({ x: 0, y: 0, length: 3, orientation: 'horizontal' }),
    ])
  })
})

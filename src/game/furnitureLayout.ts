import { DIRS, pointKey, type FurniturePiece, type Point } from './types'

export type FurnitureModuleLength = 1 | 2 | 3
export type FurnitureModuleOrientation = 'horizontal' | 'vertical'

export type FurnitureModule = Point & {
  length: FurnitureModuleLength
  orientation: FurnitureModuleOrientation
  variant: number
}

type Candidate = FurnitureModule & { keys: string[]; score: number }

function moduleCells(module: FurnitureModule): Point[] {
  return Array.from({ length: module.length }, (_, index) => ({
    x: module.x + (module.orientation === 'horizontal' ? index : 0),
    y: module.y + (module.orientation === 'vertical' ? index : 0),
  }))
}

function candidatesFor(uncovered: ReadonlySet<string>, piece: FurniturePiece, length: 2 | 3) {
  const candidates: Candidate[] = []
  for (const point of piece.cells) for (const orientation of ['horizontal', 'vertical'] as const) {
    const module: FurnitureModule = { ...point, length, orientation, variant: 0 }
    const cells = moduleCells(module)
    const keys = cells.map(pointKey)
    if (!keys.every((key) => uncovered.has(key))) continue

    const alignedNeighbors = cells.reduce((total, cell) => {
      const before = orientation === 'horizontal' ? { x: cell.x - 1, y: cell.y } : { x: cell.x, y: cell.y - 1 }
      const after = orientation === 'horizontal' ? { x: cell.x + 1, y: cell.y } : { x: cell.x, y: cell.y + 1 }
      return total + Number(uncovered.has(pointKey(before))) + Number(uncovered.has(pointKey(after)))
    }, 0)
    const perpendicularNeighbors = cells.reduce((total, cell) => {
      const first = orientation === 'horizontal' ? { x: cell.x, y: cell.y - 1 } : { x: cell.x - 1, y: cell.y }
      const second = orientation === 'horizontal' ? { x: cell.x, y: cell.y + 1 } : { x: cell.x + 1, y: cell.y }
      return total + Number(uncovered.has(pointKey(first))) + Number(uncovered.has(pointKey(second)))
    }, 0)

    candidates.push({
      ...module,
      keys,
      score: length * 100 + alignedNeighbors * 8 - perpendicularNeighbors * 3,
    })
  }
  return candidates
}

function wouldCreateLooseSingle(candidate: Candidate, uncovered: ReadonlySet<string>) {
  const remaining = new Set(uncovered)
  candidate.keys.forEach((key) => remaining.delete(key))
  return [...remaining].some((key) => {
    const [x, y] = key.split(',').map(Number)
    return !Object.values(DIRS).some((delta) => remaining.has(pointKey({ x: x + delta.x, y: y + delta.y })))
  })
}

export function furnitureModuleCells(module: FurnitureModule) {
  return moduleCells(module)
}

export function planFurnitureModules(piece: FurniturePiece): FurnitureModule[] {
  if (piece.kind === 'boundary' || piece.kind === 'pen') return []

  const uncovered = new Set(piece.cells.map(pointKey))
  const modules: FurnitureModule[] = []
  let moduleIndex = 0

  while (uncovered.size > 0) {
    const triples = candidatesFor(uncovered, piece, 3)
    const doubles = candidatesFor(uncovered, piece, 2)
    const ranked = [...triples, ...doubles].sort((a, b) => {
      const aLoose = wouldCreateLooseSingle(a, uncovered)
      const bLoose = wouldCreateLooseSingle(b, uncovered)
      if (aLoose !== bLoose) return Number(aLoose) - Number(bLoose)
      if (a.score !== b.score) return b.score - a.score
      if (a.y !== b.y) return a.y - b.y
      if (a.x !== b.x) return a.x - b.x
      return a.orientation.localeCompare(b.orientation)
    })

    const chosen = ranked[0]
    if (chosen) {
      const { keys, score: _score, ...module } = chosen
      modules.push({ ...module, variant: piece.variant + moduleIndex++ })
      keys.forEach((key) => uncovered.delete(key))
      continue
    }

    const key = [...uncovered].sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number)
      return ay - by || ax - bx
    })[0]
    const [x, y] = key.split(',').map(Number)
    modules.push({ x, y, length: 1, orientation: 'horizontal', variant: piece.variant + moduleIndex++ })
    uncovered.delete(key)
  }

  return modules
}

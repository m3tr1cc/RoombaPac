import { DIRS, pointKey, type Cell, type Direction, type FurnitureKind, type FurniturePiece, type Maze, type Point, type QuarterTurn } from './types.js'

export const MAZE_WIDTH = 31
export const MAZE_HEIGHT = 17

type ModularKind = Exclude<FurnitureKind, 'pen'>

const BASE_SHAPES: Record<ModularKind, readonly Point[]> = {
  i: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
  l: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
  t: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
}

export function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rotatedShape(kind: ModularKind, rotation: QuarterTurn) {
  let points = BASE_SHAPES[kind].map((point) => ({ ...point }))
  for (let turn = 0; turn < rotation; turn += 1) points = points.map(({ x, y }) => ({ x: -y, y: x }))
  const minX = Math.min(...points.map(({ x }) => x))
  const minY = Math.min(...points.map(({ y }) => y))
  return points.map(({ x, y }) => ({ x: x - minX, y: y - minY }))
}

function makePiece(x: number, y: number, kind: ModularKind, rotation: QuarterTurn, flipX = false): FurniturePiece {
  const shape = rotatedShape(kind, rotation)
  return {
    x, y, kind, rotation, flipX,
    width: Math.max(...shape.map((point) => point.x)) + 1,
    height: Math.max(...shape.map((point) => point.y)) + 1,
  }
}

export function furnitureCells(piece: FurniturePiece): Point[] {
  if (piece.kind === 'pen') return []
  return rotatedShape(piece.kind, piece.rotation ?? 0).map((point) => ({
    x: piece.x + (piece.flipX ? piece.width - 1 - point.x : point.x),
    y: piece.y + point.y,
  }))
}

function addPiece(cells: Cell[][], furniture: FurniturePiece[], piece: FurniturePiece) {
  furniture.push(piece)
  for (const point of furnitureCells(piece)) cells[point.y][point.x] = 1
}

function addMirroredPiece(cells: Cell[][], furniture: FurniturePiece[], piece: FurniturePiece) {
  addPiece(cells, furniture, piece)
  addPiece(cells, furniture, { ...piece, x: MAZE_WIDTH - piece.x - piece.width, flipX: true })
}

function shuffled<T>(values: readonly T[], random: () => number) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[other]
    result[other] = current
  }
  return result
}

function addRandomFurniture(cells: Cell[][], furniture: FurniturePiece[], random: () => number) {
  const rows = [2, 6, 11]
  const outerKinds = shuffled<ModularKind>(['i', 'l', 't'], random)

  rows.forEach((y, index) => {
    const outerKind = outerKinds[index]
    const outerRotation = (outerKind === 'i' ? 0 : Math.floor(random() * 4)) as QuarterTurn
    const outerX = outerKind === 'i' ? 2 : 2 + Math.floor(random() * 3)
    addMirroredPiece(cells, furniture, makePiece(outerX, y, outerKind, outerRotation))

    const innerKind: ModularKind = random() < .5 ? 'l' : 't'
    const innerRotation = Math.floor(random() * 4) as QuarterTurn
    addMirroredPiece(cells, furniture, makePiece(8, y, innerKind, innerRotation))
  })

  const topKind: ModularKind = random() < .5 ? 'i' : 't'
  const topRotation = (topKind === 'i' ? 0 : (random() < .5 ? 0 : 2)) as QuarterTurn
  addPiece(cells, furniture, makePiece(topKind === 'i' ? 13 : 14, 2, topKind, topRotation))

  const bottomKind: ModularKind = random() < .5 ? 'i' : 't'
  const bottomRotation = (bottomKind === 'i' ? 0 : (random() < .5 ? 0 : 2)) as QuarterTurn
  addPiece(cells, furniture, makePiece(bottomKind === 'i' ? 13 : 14, bottomKind === 'i' ? 13 : 12, bottomKind, bottomRotation))
}

export function createMaze(seed: number, level = 1): Maze {
  const random = mulberry32(seed ^ (level * 0x9e3779b9))
  const cells: Cell[][] = Array.from({ length: MAZE_HEIGHT }, (_, y) => (
    Array.from({ length: MAZE_WIDTH }, (_, x) => (x === 0 || y === 0 || x === MAZE_WIDTH - 1 || y === MAZE_HEIGHT - 1 ? 1 : 0))
  ))
  const furniture: FurniturePiece[] = []
  addRandomFurniture(cells, furniture, random)

  const penPiece: FurniturePiece = { x: 12, y: 6, width: 7, height: 5, kind: 'pen' }
  furniture.push(penPiece)
  for (let y = penPiece.y; y < penPiece.y + penPiece.height; y += 1) {
    for (let x = penPiece.x; x < penPiece.x + penPiece.width; x += 1) {
      const edge = x === penPiece.x || x === penPiece.x + penPiece.width - 1 || y === penPiece.y || y === penPiece.y + penPiece.height - 1
      cells[y][x] = edge ? 1 : 0
    }
  }
  cells[penPiece.y + penPiece.height - 1][MAZE_WIDTH >> 1] = 0

  const pen = { x: 15, y: 8 }
  const spawn = { x: 15, y: 15 }
  const pellets = new Set<string>()
  for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < MAZE_WIDTH - 1; x += 1) {
      const insidePen = x > penPiece.x && x < penPiece.x + penPiece.width - 1 && y > penPiece.y && y < penPiece.y + penPiece.height - 1
      if (cells[y][x] === 0 && !insidePen && pointKey({ x, y }) !== pointKey(spawn)) pellets.add(pointKey({ x, y }))
    }
  }

  const candidates = [...pellets]
    .map((key) => { const [x, y] = key.split(',').map(Number); return { x, y } })
    .sort((a, b) => Math.abs(b.x - pen.x) + Math.abs(b.y - pen.y) - Math.abs(a.x - pen.x) - Math.abs(a.y - pen.y))
  const itemPoints: Point[] = []
  for (const candidate of candidates) {
    if (itemPoints.every((item) => Math.abs(item.x - candidate.x) + Math.abs(item.y - candidate.y) >= 7)) itemPoints.push(candidate)
    if (itemPoints.length === 4) break
  }
  const items = new Set(itemPoints.map(pointKey))
  items.forEach((key) => pellets.delete(key))

  return { width: MAZE_WIDTH, height: MAZE_HEIGHT, cells, pellets, items, spawn, pen, furniture, theme: (level - 1) % 9, seed }
}

export function isWalkable(maze: Maze, point: Point) {
  return point.y >= 0 && point.y < maze.height && point.x >= 0 && point.x < maze.width && maze.cells[point.y][point.x] === 0
}

export function availableDirections(maze: Maze, point: Point): Direction[] {
  return (Object.keys(DIRS) as Direction[]).filter((direction) => {
    const delta = DIRS[direction]
    return isWalkable(maze, { x: point.x + delta.x, y: point.y + delta.y })
  })
}

export function reachableCount(maze: Maze, start = maze.spawn) {
  const seen = new Set([pointKey(start)])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()!
    for (const direction of availableDirections(maze, current)) {
      const delta = DIRS[direction]
      const next = { x: current.x + delta.x, y: current.y + delta.y }
      const key = pointKey(next)
      if (!seen.has(key)) { seen.add(key); queue.push(next) }
    }
  }
  return seen.size
}

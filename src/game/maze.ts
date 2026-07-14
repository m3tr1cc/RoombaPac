import { DIRS, pointKey, type Cell, type Direction, type FurnitureKind, type FurniturePiece, type Maze, type Point } from './types.js'

export const MAZE_WIDTH = 31
export const MAZE_HEIGHT = 17

type Obstacle = { x: number; y: number; width: number; height: number }

const LAYOUTS: readonly (readonly Obstacle[])[] = [
  [
    { x: 2, y: 2, width: 5, height: 2 }, { x: 9, y: 2, width: 3, height: 3 },
    { x: 2, y: 6, width: 4, height: 2 }, { x: 8, y: 6, width: 3, height: 3 },
    { x: 3, y: 10, width: 4, height: 2 }, { x: 9, y: 11, width: 2, height: 3 },
  ],
  [
    { x: 3, y: 2, width: 4, height: 3 }, { x: 9, y: 2, width: 2, height: 2 },
    { x: 2, y: 7, width: 5, height: 2 }, { x: 9, y: 6, width: 2, height: 3 },
    { x: 3, y: 11, width: 5, height: 2 }, { x: 9, y: 11, width: 2, height: 3 },
  ],
  [
    { x: 2, y: 2, width: 4, height: 2 }, { x: 8, y: 3, width: 3, height: 2 },
    { x: 3, y: 6, width: 3, height: 3 }, { x: 8, y: 7, width: 3, height: 2 },
    { x: 2, y: 11, width: 4, height: 2 }, { x: 8, y: 11, width: 3, height: 3 },
  ],
]

const FURNITURE_KINDS: readonly FurnitureKind[] = ['sofa', 'shelf', 'kitchen', 'bed', 'block']

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

function fillRect(cells: Cell[][], piece: FurniturePiece) {
  for (let y = piece.y; y < piece.y + piece.height; y += 1) {
    for (let x = piece.x; x < piece.x + piece.width; x += 1) cells[y][x] = 1
  }
}

function addMirroredFurniture(cells: Cell[][], furniture: FurniturePiece[], obstacle: Obstacle, kind: FurnitureKind) {
  const left: FurniturePiece = { ...obstacle, kind }
  const right: FurniturePiece = { ...obstacle, x: MAZE_WIDTH - obstacle.x - obstacle.width, kind, flipX: true }
  furniture.push(left, right)
  fillRect(cells, left)
  fillRect(cells, right)
}

function addCenterFurniture(cells: Cell[][], furniture: FurniturePiece[], obstacle: Obstacle, kind: FurnitureKind) {
  const piece: FurniturePiece = { ...obstacle, kind }
  furniture.push(piece)
  fillRect(cells, piece)
}

export function createMaze(seed: number, level = 1): Maze {
  const random = mulberry32(seed ^ (level * 0x9e3779b9))
  const cells: Cell[][] = Array.from({ length: MAZE_HEIGHT }, (_, y) => (
    Array.from({ length: MAZE_WIDTH }, (_, x) => (x === 0 || y === 0 || x === MAZE_WIDTH - 1 || y === MAZE_HEIGHT - 1 ? 1 : 0))
  ))
  const furniture: FurniturePiece[] = []
  const layout = LAYOUTS[Math.floor(random() * LAYOUTS.length)]

  for (const obstacle of layout) {
    const kind = FURNITURE_KINDS[Math.floor(random() * FURNITURE_KINDS.length)]
    addMirroredFurniture(cells, furniture, obstacle, kind)
  }

  const topCenter = level % 2 === 0
    ? { x: 13, y: 2, width: 5, height: 2 }
    : { x: 14, y: 2, width: 3, height: 2 + (level % 3 === 0 ? 1 : 0) }
  const bottomCenter = level % 2 === 0
    ? { x: 13, y: 13, width: 5, height: 2 }
    : { x: 14, y: 13, width: 3, height: 2 }
  addCenterFurniture(cells, furniture, topCenter, FURNITURE_KINDS[Math.floor(random() * FURNITURE_KINDS.length)])
  addCenterFurniture(cells, furniture, bottomCenter, FURNITURE_KINDS[Math.floor(random() * FURNITURE_KINDS.length)])

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

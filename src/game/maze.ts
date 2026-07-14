import { DIRS, pointKey, type Direction, type Maze, type Point } from './types'

export const MAZE_WIDTH = 31
export const MAZE_HEIGHT = 17

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

const inside = (x: number, y: number) => x > 0 && y > 0 && x < MAZE_WIDTH - 1 && y < MAZE_HEIGHT - 1

export function createMaze(seed: number, level = 1): Maze {
  const random = mulberry32(seed ^ (level * 0x9e3779b9))
  const cells = Array.from({ length: MAZE_HEIGHT }, () => Array.from({ length: MAZE_WIDTH }, () => 1 as 0 | 1))
  const stack: Point[] = [{ x: 1, y: 1 }]
  cells[1][1] = 0
  const directions: Point[] = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }]
  while (stack.length) {
    const current = stack[stack.length - 1]
    const options = directions.map((delta) => ({ x: current.x + delta.x, y: current.y + delta.y, delta }))
      .filter(({ x, y }) => inside(x, y) && cells[y][x] === 1)
    if (!options.length) { stack.pop(); continue }
    const next = options[Math.floor(random() * options.length)]
    cells[current.y + next.delta.y / 2][current.x + next.delta.x / 2] = 0
    cells[next.y][next.x] = 0
    stack.push(next)
  }
  for (let i = 0; i < Math.min(38, 22 + level); i += 1) {
    const x = 2 + Math.floor(random() * (MAZE_WIDTH - 4))
    const y = 2 + Math.floor(random() * (MAZE_HEIGHT - 4))
    if ((x + y) % 2 === 1) cells[y][x] = 0
  }
  const pen = { x: 15, y: 8 }
  for (let y = 6; y <= 10; y += 1) for (let x = 12; x <= 18; x += 1) cells[y][x] = 0
  const spawn = { x: 1, y: MAZE_HEIGHT - 2 }
  const pellets = new Set<string>()
  for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) for (let x = 1; x < MAZE_WIDTH - 1; x += 1) {
    if (cells[y][x] === 0 && !(x >= 12 && x <= 18 && y >= 6 && y <= 10) && pointKey({ x, y }) !== pointKey(spawn)) pellets.add(pointKey({ x, y }))
  }
  const candidates = [...pellets].map((key) => { const [x, y] = key.split(',').map(Number); return { x, y } })
    .sort((a, b) => Math.abs(b.x - pen.x) + Math.abs(b.y - pen.y) - Math.abs(a.x - pen.x) - Math.abs(a.y - pen.y))
  const items = new Set(candidates.slice(0, 4).map(pointKey))
  items.forEach((key) => pellets.delete(key))
  return { width: MAZE_WIDTH, height: MAZE_HEIGHT, cells, pellets, items, spawn, pen, theme: (level - 1) % 9, seed }
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

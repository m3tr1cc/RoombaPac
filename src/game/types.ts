export type Direction = 'up' | 'right' | 'down' | 'left'
export type Cell = 0 | 1
export type Point = { x: number; y: number }

export type Maze = {
  width: number
  height: number
  cells: Cell[][]
  pellets: Set<string>
  items: Set<string>
  spawn: Point
  pen: Point
  theme: number
  seed: number
}

export type Actor = Point & { direction: Direction; nextDirection: Direction; progress: number }
export type Pet = Actor & { id: number; home: Point; released: boolean; eatenUntil: number }
export type GameMode = 'idle' | 'playing' | 'paused' | 'life-lost' | 'level-clear' | 'game-over'
export type GameSnapshot = { mode: GameMode; score: number; level: number; lives: number; dots: number; items: number; pets: number; activeMs: number }

export const DIRS: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
}
export const OPPOSITE: Record<Direction, Direction> = { up: 'down', right: 'left', down: 'up', left: 'right' }
export const pointKey = ({ x, y }: Point) => `${x},${y}`

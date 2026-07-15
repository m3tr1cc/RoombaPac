import { DIRS, pointKey, type Cell, type Direction, type FurnitureKind, type FurniturePiece, type Maze, type ObstacleCategory, type Point, type QuarterTurn, type TunnelPair } from './types.js'

export const MAZE_WIDTH = 31
export const MAZE_HEIGHT = 17

type CoarsePoint = { x: number; y: number }
type Edge = { a: CoarsePoint; b: CoarsePoint }

const PEN_BOUNDS = { x: 12, y: 6, width: 7, height: 5 }
const SPAWN = { x: 15, y: 15 }
const PEN_HOME = { x: 15, y: 8 }
const LEVEL_ONE_TUNNEL_ROW = 8

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

function shuffled<T>(values: readonly T[], random: () => number) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

const coarseKey = ({ x, y }: CoarsePoint) => `${x},${y}`
const edgeKey = ({ a, b }: Edge) => [coarseKey(a), coarseKey(b)].sort().join('|')
const mirrorPoint = ({ x, y }: CoarsePoint): CoarsePoint => ({ x: 14 - x, y })
const mirrorEdge = ({ a, b }: Edge): Edge => ({ a: mirrorPoint(a), b: mirrorPoint(b) })
const gridPoint = ({ x, y }: CoarsePoint): Point => ({ x: x * 2 + 1, y: y * 2 + 1 })

function isReservedNode({ x, y }: CoarsePoint) {
  return x >= 6 && x <= 8 && y >= 3 && y <= 4
}

function allNodes() {
  const nodes: CoarsePoint[] = []
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 15; x += 1) {
    if (!isReservedNode({ x, y })) nodes.push({ x, y })
  }
  return nodes
}

function allEdges(nodes: readonly CoarsePoint[]) {
  const nodeKeys = new Set(nodes.map(coarseKey))
  const edges: Edge[] = []
  for (const node of nodes) {
    for (const delta of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
      const next = { x: node.x + delta.x, y: node.y + delta.y }
      if (nodeKeys.has(coarseKey(next))) edges.push({ a: node, b: next })
    }
  }
  return edges
}

class DisjointSet {
  private parent = new Map<string, string>()

  constructor(keys: readonly string[]) { keys.forEach((key) => this.parent.set(key, key)) }
  find(key: string): string {
    const parent = this.parent.get(key)!
    if (parent === key) return key
    const root = this.find(parent)
    this.parent.set(key, root)
    return root
  }
  union(a: string, b: string) {
    const rootA = this.find(a), rootB = this.find(b)
    if (rootA === rootB) return false
    this.parent.set(rootB, rootA)
    return true
  }
}

function edgeGroups(edges: readonly Edge[]) {
  const byKey = new Map(edges.map((edge) => [edgeKey(edge), edge]))
  const visited = new Set<string>()
  const groups: Edge[][] = []
  for (const edge of edges) {
    const key = edgeKey(edge)
    if (visited.has(key)) continue
    const mirrored = byKey.get(edgeKey(mirrorEdge(edge)))
    const group = mirrored && edgeKey(mirrored) !== key ? [edge, mirrored] : [edge]
    group.forEach((item) => visited.add(edgeKey(item)))
    groups.push(group)
  }
  return groups
}

function generateProceduralEdges(random: () => number) {
  const nodes = allNodes()
  const edges = allEdges(nodes)
  const groups = shuffled(edgeGroups(edges), random)
  const selected = new Map<string, Edge>()
  const set = new DisjointSet(nodes.map(coarseKey))
  const addGroup = (group: readonly Edge[]) => group.forEach((edge) => {
    selected.set(edgeKey(edge), edge)
    set.union(coarseKey(edge.a), coarseKey(edge.b))
  })

  for (const group of groups) {
    if (group.some((edge) => set.find(coarseKey(edge.a)) !== set.find(coarseKey(edge.b)))) addGroup(group)
  }

  const degree = () => {
    const result = new Map(nodes.map((node) => [coarseKey(node), 0]))
    selected.forEach((edge) => {
      result.set(coarseKey(edge.a), result.get(coarseKey(edge.a))! + 1)
      result.set(coarseKey(edge.b), result.get(coarseKey(edge.b))! + 1)
    })
    return result
  }

  for (let pass = 0; pass < 4; pass += 1) {
    const currentDegree = degree()
    const needy = nodes.filter((node) => currentDegree.get(coarseKey(node))! < 2)
    if (!needy.length) break
    for (const node of shuffled(needy, random)) {
      const nodeKey = coarseKey(node)
      const candidates = shuffled(groups.filter((group) => (
        !group.every((edge) => selected.has(edgeKey(edge))) &&
        group.some((edge) => coarseKey(edge.a) === nodeKey || coarseKey(edge.b) === nodeKey)
      )), random)
      if (candidates[0]) addGroup(candidates[0])
    }
  }

  for (const group of groups) if (random() < 0.16) addGroup(group)
  return [...selected.values()]
}

function generateLevelOneEdges() {
  // A fixed, production-safe blueprint selected from the constrained generator
  // because it contains every annotated furniture topology while preserving the
  // landscape cage and tunnel composition. It is independent of the run seed.
  const random = mulberry32(1013905061)
  random() // Match the tunnel-choice draw made by procedural levels.
  return generateProceduralEdges(random)
}

function carveMaze(edges: readonly Edge[], tunnelRow: number) {
  const cells: Cell[][] = Array.from({ length: MAZE_HEIGHT }, () => Array<Cell>(MAZE_WIDTH).fill(1))
  for (const node of allNodes()) {
    const point = gridPoint(node)
    cells[point.y][point.x] = 0
  }
  for (const edge of edges) {
    const a = gridPoint(edge.a), b = gridPoint(edge.b)
    cells[(a.y + b.y) / 2][(a.x + b.x) / 2] = 0
  }

  for (let y = PEN_BOUNDS.y; y < PEN_BOUNDS.y + PEN_BOUNDS.height; y += 1) {
    for (let x = PEN_BOUNDS.x; x < PEN_BOUNDS.x + PEN_BOUNDS.width; x += 1) cells[y][x] = 1
  }
  for (let y = PEN_BOUNDS.y + 1; y < PEN_BOUNDS.y + PEN_BOUNDS.height - 1; y += 1) {
    for (let x = PEN_BOUNDS.x + 1; x < PEN_BOUNDS.x + PEN_BOUNDS.width - 1; x += 1) cells[y][x] = 0
  }
  cells[PEN_BOUNDS.y + PEN_BOUNDS.height - 1][PEN_HOME.x] = 0
  cells[11][PEN_HOME.x] = 0
  cells[12][PEN_HOME.x] = 0
  cells[13][PEN_HOME.x] = 0

  cells[tunnelRow][0] = cells[tunnelRow][1] = 0
  cells[tunnelRow][MAZE_WIDTH - 2] = cells[tunnelRow][MAZE_WIDTH - 1] = 0
  cells[tunnelRow - 1][1] = cells[tunnelRow + 1][1] = 0
  cells[tunnelRow - 1][MAZE_WIDTH - 2] = cells[tunnelRow + 1][MAZE_WIDTH - 2] = 0

  return cells
}

function boundaryCells(cells: Cell[][]) {
  const result: Point[] = []
  for (let x = 0; x < MAZE_WIDTH; x += 1) {
    if (cells[0][x]) result.push({ x, y: 0 })
    if (cells[MAZE_HEIGHT - 1][x]) result.push({ x, y: MAZE_HEIGHT - 1 })
  }
  for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) {
    if (cells[y][0]) result.push({ x: 0, y })
    if (cells[y][MAZE_WIDTH - 1]) result.push({ x: MAZE_WIDTH - 1, y })
  }
  return result
}

function penCells() {
  const result: Point[] = []
  for (let y = PEN_BOUNDS.y; y < PEN_BOUNDS.y + PEN_BOUNDS.height; y += 1) {
    for (let x = PEN_BOUNDS.x; x < PEN_BOUNDS.x + PEN_BOUNDS.width; x += 1) {
      const edge = x === PEN_BOUNDS.x || x === PEN_BOUNDS.x + PEN_BOUNDS.width - 1 || y === PEN_BOUNDS.y || y === PEN_BOUNDS.y + PEN_BOUNDS.height - 1
      if (edge && !(y === PEN_BOUNDS.y + PEN_BOUNDS.height - 1 && x === PEN_HOME.x)) result.push({ x, y })
    }
  }
  return result
}

function componentCategory(points: readonly Point[]): { category: ObstacleCategory; kind: FurnitureKind; rotation: QuarterTurn } {
  const minX = Math.min(...points.map((point) => point.x)), maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y)), maxY = Math.max(...points.map((point) => point.y))
  const width = maxX - minX + 1, height = maxY - minY + 1
  const keys = new Set(points.map(pointKey))
  const maxDegree = Math.max(...points.map((point) => Object.values(DIRS).filter((delta) => keys.has(pointKey({ x: point.x + delta.x, y: point.y + delta.y }))).length))
  if (points.length === 1) return { category: 5, kind: 'block', rotation: 0 }
  if (width === 1 || height === 1) return points.length <= 2
    ? { category: 4, kind: 'stub', rotation: height > width ? 1 : 0 }
    : { category: 1, kind: 'straight', rotation: height > width ? 1 : 0 }
  if (width >= 5 && height >= 3 && points.length >= 10) return { category: 7, kind: 'room', rotation: width >= height ? 0 : 1 }
  if (maxDegree >= 3) return { category: 3, kind: 'junction', rotation: 0 }
  const fill = points.length / (width * height)
  if (width >= 3 && height >= 3 && fill < 0.72) return { category: 6, kind: 'alcove', rotation: 0 }
  return { category: 2, kind: 'corner', rotation: 0 }
}

function buildFurniture(cells: Cell[][], theme: number) {
  const excluded = new Set([...boundaryCells(cells), ...penCells()].map(pointKey))
  const seen = new Set<string>()
  const furniture: FurniturePiece[] = []
  let index = 0

  for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) for (let x = 1; x < MAZE_WIDTH - 1; x += 1) {
    const start = { x, y }, startKey = pointKey(start)
    if (cells[y][x] !== 1 || excluded.has(startKey) || seen.has(startKey)) continue
    const queue = [start], points: Point[] = []
    seen.add(startKey)
    while (queue.length) {
      const current = queue.shift()!
      points.push(current)
      for (const delta of Object.values(DIRS)) {
        const next = { x: current.x + delta.x, y: current.y + delta.y }, key = pointKey(next)
        if (next.x <= 0 || next.x >= MAZE_WIDTH - 1 || next.y <= 0 || next.y >= MAZE_HEIGHT - 1) continue
        if (cells[next.y][next.x] === 1 && !excluded.has(key) && !seen.has(key)) { seen.add(key); queue.push(next) }
      }
    }
    const minX = Math.min(...points.map((point) => point.x)), maxX = Math.max(...points.map((point) => point.x))
    const minY = Math.min(...points.map((point) => point.y)), maxY = Math.max(...points.map((point) => point.y))
    const classification = componentCategory(points)
    furniture.push({
      id: `obstacle-${index++}`, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1,
      cells: points, category: classification.category, kind: classification.kind, rotation: classification.rotation,
      variant: (theme + minX * 3 + minY * 5) >>> 0,
    })
  }

  const boundary = boundaryCells(cells)
  furniture.unshift({ id: 'boundary', x: 0, y: 0, width: MAZE_WIDTH, height: MAZE_HEIGHT, cells: boundary, category: 9, kind: 'boundary', variant: theme })
  furniture.push({ id: 'pet-cage', ...PEN_BOUNDS, cells: penCells(), category: 8, kind: 'pen', variant: theme })
  return furniture
}

export function furnitureCells(piece: FurniturePiece): Point[] {
  return piece.cells.map((point) => ({ ...point }))
}

function tunnelPair(row: number): TunnelPair {
  return { left: { x: 0, y: row }, right: { x: MAZE_WIDTH - 1, y: row } }
}

function graphDistance(maze: Pick<Maze, 'width' | 'height' | 'cells' | 'tunnels'>, start: Point) {
  const distances = new Map([[pointKey(start), 0]])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()!, distance = distances.get(pointKey(current))!
    for (const direction of Object.keys(DIRS) as Direction[]) {
      const next = neighborPoint(maze, current, direction)
      if (!next || !isWalkable(maze, next) || distances.has(pointKey(next))) continue
      distances.set(pointKey(next), distance + 1)
      queue.push(next)
    }
  }
  return distances
}

function makeCollectibles(maze: Pick<Maze, 'width' | 'height' | 'cells' | 'tunnels'>) {
  const pellets = new Set<string>()
  const insidePen = (point: Point) => point.x > PEN_BOUNDS.x && point.x < PEN_BOUNDS.x + PEN_BOUNDS.width - 1 && point.y > PEN_BOUNDS.y && point.y < PEN_BOUNDS.y + PEN_BOUNDS.height - 1
  for (let y = 0; y < MAZE_HEIGHT; y += 1) for (let x = 0; x < MAZE_WIDTH; x += 1) {
    const point = { x, y }
    if (maze.cells[y][x] === 0 && !insidePen(point) && pointKey(point) !== pointKey(SPAWN)) pellets.add(pointKey(point))
  }

  const distances = graphDistance(maze, PEN_HOME)
  const quadrants = [
    (point: Point) => point.x < MAZE_WIDTH / 2 && point.y < MAZE_HEIGHT / 2,
    (point: Point) => point.x > MAZE_WIDTH / 2 && point.y < MAZE_HEIGHT / 2,
    (point: Point) => point.x < MAZE_WIDTH / 2 && point.y > MAZE_HEIGHT / 2,
    (point: Point) => point.x > MAZE_WIDTH / 2 && point.y > MAZE_HEIGHT / 2,
  ]
  const candidates = [...pellets].map((key) => { const [x, y] = key.split(',').map(Number); return { x, y } })
  const itemPoints = quadrants.map((quadrant) => candidates.filter(quadrant).sort((a, b) => (distances.get(pointKey(b)) ?? 0) - (distances.get(pointKey(a)) ?? 0))[0]).filter(Boolean)
  const items = new Set(itemPoints.map(pointKey))
  items.forEach((key) => pellets.delete(key))
  return { pellets, items }
}

export function createMaze(seed: number, level = 1): Maze {
  const mixedSeed = (seed ^ Math.imul(level, 0x9e3779b9)) >>> 0
  const random = mulberry32(mixedSeed)
  const tunnelRow = level === 1 ? LEVEL_ONE_TUNNEL_ROW : (random() < 0.5 ? 6 : 10)
  const edges = level === 1 ? generateLevelOneEdges() : generateProceduralEdges(random)
  const cells = carveMaze(edges, tunnelRow)
  const tunnels = [tunnelPair(tunnelRow)]
  const theme = (level - 1) % 9
  const furniture = buildFurniture(cells, theme)
  const base = { width: MAZE_WIDTH, height: MAZE_HEIGHT, cells, tunnels }
  const { pellets, items } = makeCollectibles(base)
  return { ...base, pellets, items, spawn: { ...SPAWN }, pen: { ...PEN_HOME }, furniture, theme, seed }
}

export function isWalkable(maze: Pick<Maze, 'width' | 'height' | 'cells'>, point: Point) {
  return point.y >= 0 && point.y < maze.height && point.x >= 0 && point.x < maze.width && maze.cells[point.y][point.x] === 0
}

export function neighborPoint(maze: Pick<Maze, 'width' | 'height' | 'cells' | 'tunnels'>, point: Point, direction: Direction): Point | undefined {
  const delta = DIRS[direction]
  const next = { x: point.x + delta.x, y: point.y + delta.y }
  if (next.x >= 0 && next.x < maze.width && next.y >= 0 && next.y < maze.height) return next
  for (const tunnel of maze.tunnels) {
    if (direction === 'left' && point.x === tunnel.left.x && point.y === tunnel.left.y) return { ...tunnel.right }
    if (direction === 'right' && point.x === tunnel.right.x && point.y === tunnel.right.y) return { ...tunnel.left }
  }
  return undefined
}

export function availableDirections(maze: Maze, point: Point): Direction[] {
  return (Object.keys(DIRS) as Direction[]).filter((direction) => {
    const next = neighborPoint(maze, point, direction)
    return Boolean(next && isWalkable(maze, next))
  })
}

export function reachableCount(maze: Maze, start = maze.spawn) {
  const seen = new Set([pointKey(start)])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()!
    for (const direction of availableDirections(maze, current)) {
      const next = neighborPoint(maze, current, direction)!
      const key = pointKey(next)
      if (!seen.has(key)) { seen.add(key); queue.push(next) }
    }
  }
  return seen.size
}

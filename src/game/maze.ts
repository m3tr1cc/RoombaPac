import { DIRS, pointKey, type Cell, type Direction, type FurnitureKind, type FurniturePiece, type Maze, type ObstacleCategory, type Point, type QuarterTurn, type TunnelPair } from './types.js'

export type MazeVersion = 1 | 2

export const LEGACY_MAZE_VERSION: MazeVersion = 1
export const CURRENT_MAZE_VERSION: MazeVersion = 2
export const MAZE_WIDTH = 27
export const MAZE_HEIGHT = 15
export const COMPACT_OBSTACLE_QUOTAS = {
  room: 3,
  linear: 5,
  junction: 4,
  hybrid: 2,
  corner: 2,
  block: 2,
} as const

type CoarsePoint = { x: number; y: number }
type Edge = { a: CoarsePoint; b: CoarsePoint }

type MazeLayout = {
  version: MazeVersion
  width: number
  height: number
  coarseWidth: number
  coarseHeight: number
  reserved: { minX: number; maxX: number; minY: number; maxY: number }
  penBounds: { x: number; y: number; width: number; height: number }
  spawn: Point
  penHome: Point
  penExitEnd: number
  levelOneTunnelRow: number
  proceduralTunnelRows: readonly [number, number]
}

const LAYOUTS: Record<MazeVersion, MazeLayout> = {
  1: {
    version: 1,
    width: 31,
    height: 17,
    coarseWidth: 15,
    coarseHeight: 8,
    reserved: { minX: 6, maxX: 8, minY: 3, maxY: 4 },
    penBounds: { x: 12, y: 6, width: 7, height: 5 },
    spawn: { x: 15, y: 15 },
    penHome: { x: 15, y: 8 },
    penExitEnd: 13,
    levelOneTunnelRow: 8,
    proceduralTunnelRows: [6, 10],
  },
  2: {
    version: 2,
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    coarseWidth: 13,
    coarseHeight: 7,
    reserved: { minX: 5, maxX: 7, minY: 2, maxY: 4 },
    penBounds: { x: 10, y: 5, width: 7, height: 5 },
    spawn: { x: 13, y: 13 },
    penHome: { x: 13, y: 7 },
    penExitEnd: 11,
    levelOneTunnelRow: 7,
    proceduralTunnelRows: [5, 9],
  },
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
const mirrorPoint = ({ x, y }: CoarsePoint, layout: MazeLayout): CoarsePoint => ({ x: layout.coarseWidth - 1 - x, y })
const mirrorEdge = ({ a, b }: Edge, layout: MazeLayout): Edge => ({ a: mirrorPoint(a, layout), b: mirrorPoint(b, layout) })
const gridPoint = ({ x, y }: CoarsePoint): Point => ({ x: x * 2 + 1, y: y * 2 + 1 })

function isReservedNode({ x, y }: CoarsePoint, layout: MazeLayout) {
  const { reserved } = layout
  return x >= reserved.minX && x <= reserved.maxX && y >= reserved.minY && y <= reserved.maxY
}

function allNodes(layout: MazeLayout) {
  const nodes: CoarsePoint[] = []
  for (let y = 0; y < layout.coarseHeight; y += 1) for (let x = 0; x < layout.coarseWidth; x += 1) {
    if (!isReservedNode({ x, y }, layout)) nodes.push({ x, y })
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

function edgeGroups(edges: readonly Edge[], layout: MazeLayout) {
  const byKey = new Map(edges.map((edge) => [edgeKey(edge), edge]))
  const visited = new Set<string>()
  const groups: Edge[][] = []
  for (const edge of edges) {
    const key = edgeKey(edge)
    if (visited.has(key)) continue
    const mirrored = byKey.get(edgeKey(mirrorEdge(edge, layout)))
    const group = mirrored && edgeKey(mirrored) !== key ? [edge, mirrored] : [edge]
    group.forEach((item) => visited.add(edgeKey(item)))
    groups.push(group)
  }
  return groups
}

function generateProceduralEdges(random: () => number, layout: MazeLayout) {
  const nodes = allNodes(layout)
  const edges = allEdges(nodes)
  const groups = shuffled(edgeGroups(edges, layout), random)
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

function generateLevelOneEdges(layout: MazeLayout) {
  // A fixed, production-safe blueprint selected from the constrained generator
  // to preserve the landscape cage and tunnel composition. It is independent
  // of the run seed.
  const random = mulberry32(1013905061)
  random() // Match the tunnel-choice draw made by procedural levels.
  return generateProceduralEdges(random, layout)
}

function carveMaze(edges: readonly Edge[], tunnelRow: number, layout: MazeLayout) {
  const { width, height, penBounds, penHome } = layout
  const cells: Cell[][] = Array.from({ length: height }, () => Array<Cell>(width).fill(1))
  for (const node of allNodes(layout)) {
    const point = gridPoint(node)
    cells[point.y][point.x] = 0
  }
  for (const edge of edges) {
    const a = gridPoint(edge.a), b = gridPoint(edge.b)
    cells[(a.y + b.y) / 2][(a.x + b.x) / 2] = 0
  }

  for (let y = penBounds.y; y < penBounds.y + penBounds.height; y += 1) {
    for (let x = penBounds.x; x < penBounds.x + penBounds.width; x += 1) cells[y][x] = 1
  }
  for (let y = penBounds.y + 1; y < penBounds.y + penBounds.height - 1; y += 1) {
    for (let x = penBounds.x + 1; x < penBounds.x + penBounds.width - 1; x += 1) cells[y][x] = 0
  }
  cells[penBounds.y + penBounds.height - 1][penHome.x] = 0
  for (let y = penBounds.y + penBounds.height; y <= layout.penExitEnd; y += 1) cells[y][penHome.x] = 0

  cells[tunnelRow][0] = cells[tunnelRow][1] = 0
  cells[tunnelRow][width - 2] = cells[tunnelRow][width - 1] = 0
  cells[tunnelRow - 1][1] = cells[tunnelRow + 1][1] = 0
  cells[tunnelRow - 1][width - 2] = cells[tunnelRow + 1][width - 2] = 0

  return cells
}

function boundaryCells(cells: Cell[][], layout: MazeLayout) {
  const result: Point[] = []
  for (let x = 0; x < layout.width; x += 1) {
    if (cells[0][x]) result.push({ x, y: 0 })
    if (cells[layout.height - 1][x]) result.push({ x, y: layout.height - 1 })
  }
  for (let y = 1; y < layout.height - 1; y += 1) {
    if (cells[y][0]) result.push({ x: 0, y })
    if (cells[y][layout.width - 1]) result.push({ x: layout.width - 1, y })
  }
  return result
}

function penCells(layout: MazeLayout) {
  const result: Point[] = []
  const { penBounds, penHome } = layout
  for (let y = penBounds.y; y < penBounds.y + penBounds.height; y += 1) {
    for (let x = penBounds.x; x < penBounds.x + penBounds.width; x += 1) {
      const edge = x === penBounds.x || x === penBounds.x + penBounds.width - 1 || y === penBounds.y || y === penBounds.y + penBounds.height - 1
      if (edge && !(y === penBounds.y + penBounds.height - 1 && x === penHome.x)) result.push({ x, y })
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

function buildFurniture(cells: Cell[][], theme: number, layout: MazeLayout) {
  const excluded = new Set([...boundaryCells(cells, layout), ...penCells(layout)].map(pointKey))
  const seen = new Set<string>()
  const furniture: FurniturePiece[] = []
  let index = 0

  for (let y = 1; y < layout.height - 1; y += 1) for (let x = 1; x < layout.width - 1; x += 1) {
    const start = { x, y }, startKey = pointKey(start)
    if (cells[y][x] !== 1 || excluded.has(startKey) || seen.has(startKey)) continue
    const queue = [start], points: Point[] = []
    seen.add(startKey)
    while (queue.length) {
      const current = queue.shift()!
      points.push(current)
      for (const delta of Object.values(DIRS)) {
        const next = { x: current.x + delta.x, y: current.y + delta.y }, key = pointKey(next)
        if (next.x <= 0 || next.x >= layout.width - 1 || next.y <= 0 || next.y >= layout.height - 1) continue
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

  const boundary = boundaryCells(cells, layout)
  furniture.unshift({ id: 'boundary', x: 0, y: 0, width: layout.width, height: layout.height, cells: boundary, category: 9, kind: 'boundary', variant: theme })
  furniture.push({ id: 'pet-cage', ...layout.penBounds, cells: penCells(layout), category: 8, kind: 'pen', variant: theme })
  return furniture
}

type CompactQuotaKind = keyof typeof COMPACT_OBSTACLE_QUOTAS

const COMPACT_MASKS: Record<CompactQuotaKind, readonly string[]> = {
  room: ['11111', '11111', '11111'],
  linear: ['111'],
  junction: ['111', '111', '010'],
  hybrid: ['111', '100', '100'],
  corner: ['111', '111', '100'],
  block: ['1'],
}

const COMPACT_KIND_METADATA: Record<CompactQuotaKind, { kind: FurnitureKind; category: ObstacleCategory }> = {
  room: { kind: 'room', category: 7 },
  linear: { kind: 'straight', category: 1 },
  junction: { kind: 'junction', category: 3 },
  hybrid: { kind: 'alcove', category: 6 },
  corner: { kind: 'corner', category: 2 },
  block: { kind: 'block', category: 5 },
}

function rotateMaskPoint(point: Point, width: number, height: number, rotation: QuarterTurn): Point {
  if (rotation === 0) return point
  if (rotation === 1) return { x: height - 1 - point.y, y: point.x }
  if (rotation === 2) return { x: width - 1 - point.x, y: height - 1 - point.y }
  return { x: point.y, y: width - 1 - point.x }
}

function makeCompactPiece(id: string, quotaKind: CompactQuotaKind, x: number, y: number, rotation: QuarterTurn, variant: number): FurniturePiece {
  const mask = COMPACT_MASKS[quotaKind]
  const sourceWidth = mask[0].length, sourceHeight = mask.length
  const offsets = mask.flatMap((row, rowIndex) => [...row].flatMap((value, columnIndex) => (
    value === '1' ? [rotateMaskPoint({ x: columnIndex, y: rowIndex }, sourceWidth, sourceHeight, rotation)] : []
  )))
  const sideways = rotation % 2 === 1
  const width = sideways ? sourceHeight : sourceWidth
  const height = sideways ? sourceWidth : sourceHeight
  const metadata = COMPACT_KIND_METADATA[quotaKind]
  return {
    id,
    x,
    y,
    width,
    height,
    cells: offsets.map((point) => ({ x: x + point.x, y: y + point.y })),
    kind: metadata.kind,
    category: metadata.category,
    rotation,
    variant,
  }
}

function mirrorCompactPiece(piece: FurniturePiece, layout: MazeLayout): FurniturePiece {
  const cells = piece.cells.map((point) => ({ x: layout.width - 1 - point.x, y: point.y }))
  const minX = Math.min(...cells.map((point) => point.x)), maxX = Math.max(...cells.map((point) => point.x))
  const minY = Math.min(...cells.map((point) => point.y)), maxY = Math.max(...cells.map((point) => point.y))
  return { ...piece, id: `${piece.id}-mirror`, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, cells, variant: piece.variant ^ 0x9e3779b9 }
}

function buildCompactWorld(seed: number, tunnelRow: number, theme: number, layout: MazeLayout) {
  const cells: Cell[][] = Array.from({ length: layout.height }, () => Array<Cell>(layout.width).fill(0))
  for (let x = 0; x < layout.width; x += 1) cells[0][x] = cells[layout.height - 1][x] = 1
  for (let y = 1; y < layout.height - 1; y += 1) cells[y][0] = cells[y][layout.width - 1] = 1
  cells[tunnelRow][0] = cells[tunnelRow][layout.width - 1] = 0
  penCells(layout).forEach((point) => { cells[point.y][point.x] = 1 })

  const random = mulberry32(seed)
  let pieceIndex = 0
  const pieces: FurniturePiece[] = []
  const rotation = () => Math.floor(random() * 4) as QuarterTurn
  const addPair = (quotaKind: CompactQuotaKind, x: number, y: number, pieceRotation: QuarterTurn) => {
    const piece = makeCompactPiece(`compact-${pieceIndex++}`, quotaKind, x, y, pieceRotation, (seed + pieceIndex * 0x45d9f3b) >>> 0)
    pieces.push(piece, mirrorCompactPiece(piece, layout))
  }

  addPair('room', 1, 1, 0)
  addPair('junction', 2, 5, rotation())
  addPair('hybrid', 6, 5, rotation())
  addPair('junction', 2, 9, rotation())
  addPair('corner', 6, 9, 0)
  addPair('linear', 10, 10, 0)
  addPair('linear', 5, 13, 0)
  addPair('block', 1, 13, 0)
  pieces.push(makeCompactPiece(`compact-${pieceIndex++}`, 'room', 11, 1, 0, seed ^ 0x27d4eb2d))
  pieces.push(makeCompactPiece(`compact-${pieceIndex++}`, 'linear', 12, 12, 0, seed ^ 0x165667b1))

  for (const piece of pieces) for (const point of piece.cells) {
    if (cells[point.y]?.[point.x] !== 0) throw new Error(`Compact obstacle ${piece.id} overlaps another wall at ${pointKey(point)}`)
    cells[point.y][point.x] = 1
  }

  const boundary = boundaryCells(cells, layout)
  const furniture: FurniturePiece[] = [
    { id: 'boundary', x: 0, y: 0, width: layout.width, height: layout.height, cells: boundary, category: 9, kind: 'boundary', variant: theme },
    ...pieces,
    { id: 'pet-cage', ...layout.penBounds, cells: penCells(layout), category: 8, kind: 'pen', variant: theme },
  ]
  return { cells, furniture }
}

export function furnitureCells(piece: FurniturePiece): Point[] {
  return piece.cells.map((point) => ({ ...point }))
}

function tunnelPair(row: number, layout: MazeLayout): TunnelPair {
  return { left: { x: 0, y: row }, right: { x: layout.width - 1, y: row } }
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

function makeCollectibles(maze: Pick<Maze, 'width' | 'height' | 'cells' | 'tunnels'>, layout: MazeLayout) {
  const pellets = new Set<string>()
  const { penBounds, spawn } = layout
  const insidePen = (point: Point) => point.x > penBounds.x && point.x < penBounds.x + penBounds.width - 1 && point.y > penBounds.y && point.y < penBounds.y + penBounds.height - 1
  for (let y = 0; y < layout.height; y += 1) for (let x = 0; x < layout.width; x += 1) {
    const point = { x, y }
    if (maze.cells[y][x] === 0 && !insidePen(point) && pointKey(point) !== pointKey(spawn)) pellets.add(pointKey(point))
  }

  const distances = graphDistance(maze, layout.penHome)
  const quadrants = [
    (point: Point) => point.x < layout.width / 2 && point.y < layout.height / 2,
    (point: Point) => point.x > layout.width / 2 && point.y < layout.height / 2,
    (point: Point) => point.x < layout.width / 2 && point.y > layout.height / 2,
    (point: Point) => point.x > layout.width / 2 && point.y > layout.height / 2,
  ]
  const candidates = [...pellets].map((key) => { const [x, y] = key.split(',').map(Number); return { x, y } })
  const itemPoints = quadrants.map((quadrant) => candidates.filter(quadrant).sort((a, b) => (distances.get(pointKey(b)) ?? 0) - (distances.get(pointKey(a)) ?? 0))[0]).filter(Boolean)
  const items = new Set(itemPoints.map(pointKey))
  items.forEach((key) => pellets.delete(key))
  return { pellets, items }
}

export function createMaze(seed: number, level = 1, version: MazeVersion = CURRENT_MAZE_VERSION): Maze {
  const layout = LAYOUTS[version]
  const mixedSeed = (seed ^ Math.imul(level, 0x9e3779b9)) >>> 0
  const random = mulberry32(mixedSeed)
  const tunnelRow = level === 1 ? layout.levelOneTunnelRow : layout.proceduralTunnelRows[random() < 0.5 ? 0 : 1]
  const tunnels = [tunnelPair(tunnelRow, layout)]
  const theme = (level - 1) % 9
  let cells: Cell[][]
  let furniture: FurniturePiece[]
  if (version === CURRENT_MAZE_VERSION) {
    const world = buildCompactWorld(level === 1 ? 1013905061 : mixedSeed, tunnelRow, theme, layout)
    cells = world.cells
    furniture = world.furniture
  } else {
    const edges = level === 1 ? generateLevelOneEdges(layout) : generateProceduralEdges(random, layout)
    cells = carveMaze(edges, tunnelRow, layout)
    furniture = buildFurniture(cells, theme, layout)
  }
  const base = { width: layout.width, height: layout.height, cells, tunnels }
  const { pellets, items } = makeCollectibles(base, layout)
  return { ...base, pellets, items, spawn: { ...layout.spawn }, pen: { ...layout.penHome }, furniture, theme, seed }
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

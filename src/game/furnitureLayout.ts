import { PLACEABLE_FURNITURE_SPRITES, resolveFurnitureSprite, type FurnitureFamily, type FurnitureSpriteDefinition } from './furnitureSprites'
import { pointKey, type FurniturePiece, type Point, type QuarterTurn } from './types'

export type FurniturePlacement = Point & {
  spriteId: string
  rotation: QuarterTurn
  artRotation: QuarterTurn
  width: number
  height: number
  cells: Point[]
}

type OrientedSprite = {
  definition: FurnitureSpriteDefinition
  rotation: QuarterTurn
  width: number
  height: number
  offsets: Point[]
}

function rotatePoint(point: Point, width: number, height: number, rotation: QuarterTurn): Point {
  if (rotation === 0) return point
  if (rotation === 1) return { x: height - 1 - point.y, y: point.x }
  if (rotation === 2) return { x: width - 1 - point.x, y: height - 1 - point.y }
  return { x: point.y, y: width - 1 - point.x }
}

function orientedSprite(definition: FurnitureSpriteDefinition, rotation: QuarterTurn): OrientedSprite {
  const [sourceWidth, sourceHeight] = definition.footprint
  const offsets = definition.mask.flatMap((row, y) => [...row].flatMap((value, x) => (
    value === '1' ? [rotatePoint({ x, y }, sourceWidth, sourceHeight, rotation)] : []
  )))
  const sideways = rotation % 2 === 1
  return {
    definition,
    rotation,
    width: sideways ? sourceHeight : sourceWidth,
    height: sideways ? sourceWidth : sourceHeight,
    offsets,
  }
}

function stableHash(value: string, seed: number) {
  let hash = seed >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function candidatePlacements(target: Point, uncovered: ReadonlySet<string>) {
  const candidates: FurniturePlacement[] = []
  for (const definition of PLACEABLE_FURNITURE_SPRITES) for (const rotation of definition.rotations) {
    const oriented = orientedSprite(definition, rotation)
    for (const targetOffset of oriented.offsets) {
      const x = target.x - targetOffset.x
      const y = target.y - targetOffset.y
      const cells = oriented.offsets.map((offset) => ({ x: x + offset.x, y: y + offset.y }))
      if (!cells.every((cell) => uncovered.has(pointKey(cell)))) continue
      candidates.push({
        x,
        y,
        spriteId: definition.id,
        rotation,
        artRotation: rotation,
        width: oriented.width,
        height: oriented.height,
        cells,
      })
    }
  }
  return candidates
}

function familyFor(placement: FurniturePlacement) {
  return resolveFurnitureSprite(placement.spriteId).family
}

function artRotationFor(placement: FurniturePlacement, piece: FurniturePiece): QuarterTurn {
  const definition = resolveFurnitureSprite(placement.spriteId)
  const solid = definition.mask.every((row) => !row.includes('0'))
  if (!solid) return placement.rotation

  const orientationHash = stableHash(
    `${piece.id}:${placement.x}:${placement.y}:${placement.spriteId}:art`,
    piece.variant,
  )
  const [width, height] = definition.footprint
  if (width === height) return (orientationHash % 4) as QuarterTurn
  return ((placement.rotation + (orientationHash % 2) * 2) % 4) as QuarterTurn
}

export function furniturePlacementCells(placement: FurniturePlacement) {
  return placement.cells.map((cell) => ({ ...cell }))
}

const placementCache = new WeakMap<FurniturePiece, Map<number, FurniturePlacement[]>>()

export function planFurniturePlacements(piece: FurniturePiece, theme: number): FurniturePlacement[] {
  if (piece.kind === 'boundary' || piece.kind === 'pen') return []
  const cached = placementCache.get(piece)?.get(theme)
  if (cached) return cached

  const uncovered = new Set(piece.cells.map(pointKey))
  const placements: FurniturePlacement[] = []
  const familyUses = new Map<FurnitureFamily, number>()
  const spriteUses = new Map<string, number>()

  while (uncovered.size > 0) {
    const targetKey = [...uncovered].sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number)
      return ay - by || ax - bx
    })[0]
    const [x, y] = targetKey.split(',').map(Number)
    const candidates = candidatePlacements({ x, y }, uncovered)
    candidates.sort((a, b) => {
      const aDefinition = resolveFurnitureSprite(a.spriteId)
      const bDefinition = resolveFurnitureSprite(b.spriteId)
      if (a.cells.length !== b.cells.length) return b.cells.length - a.cells.length
      const aTheme = Number(aDefinition.themes.includes(theme))
      const bTheme = Number(bDefinition.themes.includes(theme))
      if (piece.generationRole !== 'helper' && aTheme !== bTheme) return bTheme - aTheme
      const aFamilyUses = familyUses.get(aDefinition.family) ?? 0
      const bFamilyUses = familyUses.get(bDefinition.family) ?? 0
      if (aFamilyUses !== bFamilyUses) return aFamilyUses - bFamilyUses
      const aSpriteUses = spriteUses.get(a.spriteId) ?? 0
      const bSpriteUses = spriteUses.get(b.spriteId) ?? 0
      if (aSpriteUses !== bSpriteUses) return aSpriteUses - bSpriteUses
      const aHash = stableHash(`${piece.id}:${a.x}:${a.y}:${a.spriteId}:${a.rotation}`, piece.variant)
      const bHash = stableHash(`${piece.id}:${b.x}:${b.y}:${b.spriteId}:${b.rotation}`, piece.variant)
      return aHash - bHash
    })

    const chosen = candidates[0]
    if (!chosen) throw new Error(`Furniture catalog cannot cover ${targetKey} in ${piece.id}`)
    chosen.artRotation = artRotationFor(chosen, piece)
    placements.push(chosen)
    chosen.cells.forEach((cell) => uncovered.delete(pointKey(cell)))
    const family = familyFor(chosen)
    familyUses.set(family, (familyUses.get(family) ?? 0) + 1)
    spriteUses.set(chosen.spriteId, (spriteUses.get(chosen.spriteId) ?? 0) + 1)
  }

  const byTheme = placementCache.get(piece) ?? new Map<number, FurniturePlacement[]>()
  byTheme.set(theme, placements)
  placementCache.set(piece, byTheme)
  return placements
}

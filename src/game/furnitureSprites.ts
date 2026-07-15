import type { AtlasRect } from './petSprites'
import type { QuarterTurn } from './types'

export const FURNITURE_ATLAS_URL = '/assets/game/roombapac-furniture.png'
export const FURNITURE_ATLAS_SIZE = { width: 1536, height: 1024 } as const

export type FurnitureFamily =
  | 'chair'
  | 'sofa'
  | 'cabinet'
  | 'table'
  | 'appliance'
  | 'plant'
  | 'rug'
  | 'fireplace'
  | 'corner'
  | 'junction'
  | 'alcove'
  | 'room'

export type FurnitureSpriteDefinition = {
  id: string
  rect: AtlasRect
  footprint: readonly [width: number, height: number]
  mask: readonly string[]
  family: FurnitureFamily
  themes: readonly number[]
  rotations: readonly QuarterTurn[]
  collisionEligible: boolean
}

const ALL_THEMES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
const LIVING_THEMES = [0, 1, 4, 7, 8] as const
const WOOD_THEMES = [0, 2, 5, 8] as const
const KITCHEN_THEMES = [2, 3, 6, 8] as const
const UTILITY_THEMES = [3, 6, 8] as const
const DECOR_THEMES = [1, 4, 5, 7, 8] as const

const solidMask = (width: number, height: number) => Array.from({ length: height }, () => '1'.repeat(width))

function sprite(
  id: string,
  rect: AtlasRect,
  footprint: readonly [number, number],
  family: FurnitureFamily,
  themes: readonly number[] = ALL_THEMES,
  rotations: readonly QuarterTurn[] = footprint[0] === footprint[1] ? [0] : [0, 1],
  collisionEligible = true,
  mask: readonly string[] = solidMask(...footprint),
): FurnitureSpriteDefinition {
  return { id, rect, footprint, mask, family, themes, rotations, collisionEligible }
}

const oneCellSprites = [
  sprite('green-armchair', [613, 376, 46, 43], [1, 1], 'chair', LIVING_THEMES),
  sprite('orange-armchair', [693, 376, 46, 43], [1, 1], 'chair', LIVING_THEMES),
  sprite('brown-stool', [868, 376, 49, 42], [1, 1], 'chair', WOOD_THEMES),
  sprite('green-desk-chair', [968, 371, 39, 48], [1, 1], 'chair', LIVING_THEMES),
  sprite('blue-desk-chair', [1029, 373, 35, 45], [1, 1], 'chair', LIVING_THEMES),
  sprite('beige-desk-chair', [1089, 373, 36, 46], [1, 1], 'chair', LIVING_THEMES),
  sprite('narrow-nightstand', [1146, 375, 35, 45], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('red-desk-chair', [1204, 373, 36, 47], [1, 1], 'chair', LIVING_THEMES),
  sprite('green-side-chair', [1260, 374, 34, 47], [1, 1], 'chair', LIVING_THEMES),
  sprite('plant-stand', [1312, 372, 32, 50], [1, 1], 'plant', DECOR_THEMES),
  sprite('etched-cabinet', [1363, 374, 34, 48], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('stone-pedestal', [1416, 374, 30, 48], [1, 1], 'table', DECOR_THEMES),
  sprite('tall-nightstand', [1465, 374, 33, 48], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('green-ottoman', [613, 435, 47, 45], [1, 1], 'sofa', LIVING_THEMES),
  sprite('orange-ottoman', [692, 435, 48, 45], [1, 1], 'sofa', LIVING_THEMES),
  sprite('wooden-bench', [867, 438, 51, 46], [1, 1], 'table', WOOD_THEMES),
  sprite('compact-washer', [1256, 439, 38, 52], [1, 1], 'appliance', UTILITY_THEMES),
  sprite('compact-dryer', [1317, 439, 36, 52], [1, 1], 'appliance', UTILITY_THEMES),
  sprite('utility-bin', [1375, 440, 32, 51], [1, 1], 'appliance', UTILITY_THEMES),
  sprite('green-club-chair', [613, 500, 46, 44], [1, 1], 'chair', LIVING_THEMES),
  sprite('beige-club-chair', [692, 500, 48, 44], [1, 1], 'chair', LIVING_THEMES),
  sprite('red-club-chair', [868, 502, 50, 42], [1, 1], 'chair', LIVING_THEMES),
  sprite('small-drawer', [565, 74, 37, 43], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('medium-drawer-a', [525, 158, 31, 46], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('medium-drawer-b', [572, 158, 30, 46], [1, 1], 'cabinet', WOOD_THEMES),
  sprite('long-drawer', [573, 245, 30, 51], [1, 1], 'cabinet', WOOD_THEMES),
] as const

const straightSprites = [
  sprite('short-dresser-a', [38, 72, 69, 44], [2, 1], 'cabinet', WOOD_THEMES),
  sprite('short-dresser-b', [127, 72, 73, 46], [2, 1], 'cabinet', WOOD_THEMES),
  sprite('short-green-sofa', [217, 72, 70, 45], [2, 1], 'sofa', LIVING_THEMES),
  sprite('short-red-sofa', [302, 72, 69, 45], [2, 1], 'sofa', LIVING_THEMES),
  sprite('short-blue-sofa', [387, 72, 90, 45], [2, 1], 'sofa', LIVING_THEMES),
  sprite('short-sideboard', [492, 74, 59, 43], [2, 1], 'cabinet', WOOD_THEMES),
  sprite('stub-tea-table', [775, 376, 57, 42], [2, 1], 'table', DECOR_THEMES),
  sprite('stub-snack-table', [773, 438, 61, 45], [2, 1], 'table', DECOR_THEMES),
  sprite('drink-sideboard', [970, 436, 87, 53], [2, 1], 'cabinet', KITCHEN_THEMES),
  sprite('wide-dresser', [1081, 437, 72, 54], [2, 1], 'cabinet', WOOD_THEMES),
  sprite('utility-counter', [1175, 439, 61, 52], [2, 1], 'appliance', UTILITY_THEMES),
  sprite('low-tea-table', [773, 502, 61, 42], [2, 1], 'table', DECOR_THEMES),
  sprite('medium-dresser-a', [36, 156, 115, 47], [3, 1], 'cabinet', WOOD_THEMES),
  sprite('medium-green-sofa', [172, 156, 112, 47], [3, 1], 'sofa', LIVING_THEMES),
  sprite('medium-red-sofa', [301, 156, 85, 47], [3, 1], 'sofa', LIVING_THEMES),
  sprite('medium-blue-sofa', [405, 156, 99, 47], [3, 1], 'sofa', LIVING_THEMES),
  sprite('long-dresser', [37, 245, 161, 51], [4, 1], 'cabinet', WOOD_THEMES),
  sprite('long-green-sofa', [219, 245, 107, 51], [3, 1], 'sofa', LIVING_THEMES),
  sprite('long-red-sofa', [346, 245, 98, 51], [3, 1], 'sofa', LIVING_THEMES),
  sprite('long-blue-sofa', [464, 245, 86, 51], [3, 1], 'sofa', LIVING_THEMES),
] as const

const cornerMasks = [
  ['111', '111', '100'],
  ['111', '111', '001'],
] as const

const shapeSprites = [
  sprite('green-cabinet-corner', [940, 50, 121, 87], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('green-cabinet-corner-mirror', [1088, 49, 123, 88], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('blue-cabinet-corner', [1239, 50, 122, 88], [3, 3], 'corner', LIVING_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('blue-cabinet-corner-mirror', [1381, 51, 123, 87], [3, 3], 'corner', LIVING_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('red-library-corner', [940, 158, 121, 90], [3, 3], 'corner', WOOD_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('red-library-corner-mirror', [1088, 158, 121, 90], [3, 3], 'corner', WOOD_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('red-kitchen-corner', [1240, 158, 120, 90], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('red-kitchen-corner-mirror', [1385, 158, 118, 90], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('white-kitchen-corner', [938, 260, 123, 90], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('white-kitchen-corner-mirror', [1087, 261, 122, 89], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('mixed-kitchen-corner', [1240, 260, 121, 92], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[0]),
  sprite('mixed-kitchen-corner-mirror', [1384, 260, 119, 91], [3, 3], 'corner', KITCHEN_THEMES, [0, 1, 2, 3], true, cornerMasks[1]),
  sprite('wood-t-junction', [23, 384, 123, 94], [3, 3], 'junction', WOOD_THEMES, [0, 1, 2, 3], true, ['111', '111', '010']),
  sprite('garden-t-junction', [169, 383, 123, 95], [3, 3], 'junction', DECOR_THEMES, [0, 1, 2, 3], true, ['111', '111', '010']),
  sprite('kitchen-t-junction', [316, 386, 119, 91], [3, 3], 'junction', KITCHEN_THEMES, [0, 1, 2, 3], true, ['111', '100', '100']),
  sprite('blue-t-junction', [461, 386, 116, 91], [3, 3], 'junction', LIVING_THEMES, [0, 1, 2, 3], true, ['111', '100', '100']),
  sprite('green-sofa-alcove', [23, 593, 116, 92], [3, 3], 'alcove', LIVING_THEMES, [0, 1, 2, 3], true, ['111', '101', '101']),
  sprite('red-sofa-alcove', [162, 593, 125, 92], [3, 3], 'alcove', LIVING_THEMES, [0, 1, 2, 3], true, ['111', '101', '101']),
  sprite('blue-sofa-alcove', [318, 593, 122, 92], [3, 3], 'alcove', LIVING_THEMES, [0, 1, 2, 3], true, ['111', '101', '101']),
  sprite('library-alcove', [465, 595, 131, 90], [3, 3], 'alcove', WOOD_THEMES, [0, 1, 2, 3], true, ['111', '101', '101']),
  sprite('library-room', [662, 587, 190, 117], [5, 3], 'room', LIVING_THEMES, [0, 1], true),
  sprite('kitchen-room', [873, 587, 219, 118], [6, 3], 'room', KITCHEN_THEMES, [0, 1], true),
  sprite('bedroom-room', [662, 705, 190, 117], [5, 3], 'room', DECOR_THEMES, [0, 1], true),
  sprite('study-room', [873, 706, 219, 117], [6, 3], 'room', WOOD_THEMES, [0, 1], true),
  sprite('stone-fireplace', [1427, 453, 69, 99], [2, 2], 'fireplace', DECOR_THEMES),
] as const

const decorativeSprites = [
  sprite('round-rug', [969, 511, 42, 38], [1, 1], 'rug', DECOR_THEMES, [0], false),
  sprite('green-rug', [1041, 510, 54, 39], [1, 1], 'rug', DECOR_THEMES, [0], false),
  sprite('red-rug', [1122, 511, 58, 41], [1, 1], 'rug', DECOR_THEMES, [0], false),
  sprite('blue-rug', [1204, 514, 58, 39], [1, 1], 'rug', DECOR_THEMES, [0], false),
] as const

export const FURNITURE_SPRITES = [
  ...oneCellSprites,
  ...straightSprites,
  ...shapeSprites,
  ...decorativeSprites,
] as const satisfies readonly FurnitureSpriteDefinition[]

export const PLACEABLE_FURNITURE_SPRITES = FURNITURE_SPRITES.filter(({ collisionEligible }) => collisionEligible)

const spritesById = new Map(FURNITURE_SPRITES.map((definition) => [definition.id, definition]))

export function resolveFurnitureSprite(id: string) {
  const definition = spritesById.get(id)
  if (!definition) throw new RangeError(`Unknown furniture sprite: ${id}`)
  return definition
}

export function furnitureSpriteCount() {
  return FURNITURE_SPRITES.length
}

export const PET_CAGE_SPRITE: Pick<FurnitureSpriteDefinition, 'rect' | 'footprint'> = {
  rect: [1168, 585, 222, 216],
  footprint: [7, 5],
}

const BOUNDARY_SPRITES: AtlasRect[] = [
  [26, 858, 253, 31],
  [304, 858, 146, 31],
  [475, 858, 152, 31],
  [410, 936, 319, 34],
]

export function resolveBoundarySprite(variant: number) {
  return BOUNDARY_SPRITES[variant % BOUNDARY_SPRITES.length]
}

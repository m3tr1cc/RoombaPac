import type { AtlasRect } from './petSprites'
import type { ObstacleCategory } from './types'

export const FURNITURE_ATLAS_URL = '/assets/game/roombapac-furniture.png'

export type FurnitureSprite = {
  rect: AtlasRect
  referenceWidth: number
  referenceHeight: number
}

export type FurnitureBlockSprite = FurnitureSprite & { blocks: 1 | 2 | 3 }

const sprites = {
  1: [
    { rect: [37, 154, 113, 48], referenceWidth: 3, referenceHeight: 1 },
    { rect: [171, 154, 117, 49], referenceWidth: 3, referenceHeight: 1 },
    { rect: [301, 154, 104, 49], referenceWidth: 3, referenceHeight: 1 },
    { rect: [405, 154, 101, 49], referenceWidth: 3, referenceHeight: 1 },
  ],
  2: [
    { rect: [940, 50, 121, 87], referenceWidth: 3, referenceHeight: 3 },
    { rect: [1088, 49, 123, 88], referenceWidth: 3, referenceHeight: 3 },
    { rect: [1239, 50, 122, 88], referenceWidth: 3, referenceHeight: 3 },
    { rect: [1381, 51, 123, 87], referenceWidth: 3, referenceHeight: 3 },
  ],
  3: [
    { rect: [22, 382, 132, 97], referenceWidth: 3, referenceHeight: 3 },
    { rect: [166, 382, 125, 97], referenceWidth: 3, referenceHeight: 3 },
    { rect: [312, 382, 122, 98], referenceWidth: 3, referenceHeight: 3 },
    { rect: [458, 382, 121, 98], referenceWidth: 3, referenceHeight: 3 },
  ],
  4: [
    { rect: [612, 372, 48, 49], referenceWidth: 1, referenceHeight: 1 },
    { rect: [691, 371, 49, 51], referenceWidth: 1, referenceHeight: 1 },
    { rect: [778, 370, 61, 52], referenceWidth: 2, referenceHeight: 1 },
    { rect: [847, 372, 50, 50], referenceWidth: 1, referenceHeight: 1 },
  ],
  5: [
    { rect: [967, 370, 40, 52], referenceWidth: 1, referenceHeight: 1 },
    { rect: [1017, 372, 40, 50], referenceWidth: 1, referenceHeight: 1 },
    { rect: [1069, 372, 42, 51], referenceWidth: 1, referenceHeight: 1 },
    { rect: [1121, 371, 39, 51], referenceWidth: 1, referenceHeight: 1 },
  ],
  6: [
    { rect: [22, 588, 118, 101], referenceWidth: 3, referenceHeight: 3 },
    { rect: [160, 589, 126, 101], referenceWidth: 3, referenceHeight: 3 },
    { rect: [314, 588, 126, 102], referenceWidth: 3, referenceHeight: 3 },
    { rect: [458, 588, 139, 102], referenceWidth: 3, referenceHeight: 3 },
  ],
  7: [
    { rect: [662, 587, 190, 117], referenceWidth: 5, referenceHeight: 3 },
    { rect: [873, 587, 219, 118], referenceWidth: 6, referenceHeight: 3 },
    { rect: [662, 705, 190, 117], referenceWidth: 5, referenceHeight: 3 },
    { rect: [873, 706, 219, 117], referenceWidth: 6, referenceHeight: 3 },
  ],
  8: [{ rect: [1168, 585, 222, 216], referenceWidth: 7, referenceHeight: 5 }],
  9: [
    { rect: [26, 858, 253, 31], referenceWidth: 6, referenceHeight: 1 },
    { rect: [304, 858, 146, 31], referenceWidth: 4, referenceHeight: 1 },
    { rect: [475, 858, 152, 31], referenceWidth: 4, referenceHeight: 1 },
    { rect: [410, 936, 319, 34], referenceWidth: 8, referenceHeight: 1 },
  ],
} satisfies Record<ObstacleCategory, FurnitureSprite[]>

export function resolveFurnitureSprite(category: ObstacleCategory, variant: number) {
  const choices = sprites[category]
  return choices[variant % choices.length]
}

export function furnitureSpriteCount(category: ObstacleCategory) {
  return sprites[category].length
}

const oneBlockSprites: FurnitureBlockSprite[] = [
  { rect: [964, 367, 45, 54], referenceWidth: 1, referenceHeight: 1, blocks: 1 },
  { rect: [1025, 369, 42, 52], referenceWidth: 1, referenceHeight: 1, blocks: 1 },
  { rect: [1085, 369, 43, 53], referenceWidth: 1, referenceHeight: 1, blocks: 1 },
  { rect: [1200, 369, 43, 54], referenceWidth: 1, referenceHeight: 1, blocks: 1 },
  { rect: [1256, 370, 41, 54], referenceWidth: 1, referenceHeight: 1, blocks: 1 },
]

const twoBlockSprites: FurnitureBlockSprite[] = [
  { rect: [771, 372, 64, 50], referenceWidth: 2, referenceHeight: 1, blocks: 2 },
  { rect: [769, 434, 68, 52], referenceWidth: 2, referenceHeight: 1, blocks: 2 },
  { rect: [769, 498, 68, 49], referenceWidth: 2, referenceHeight: 1, blocks: 2 },
]

const threeBlockSprites: FurnitureBlockSprite[] = [
  { rect: [32, 152, 122, 54], referenceWidth: 3, referenceHeight: 1, blocks: 3 },
  { rect: [168, 152, 119, 54], referenceWidth: 3, referenceHeight: 1, blocks: 3 },
  { rect: [297, 152, 92, 54], referenceWidth: 3, referenceHeight: 1, blocks: 3 },
  { rect: [401, 152, 106, 54], referenceWidth: 3, referenceHeight: 1, blocks: 3 },
]

const categoryOffsets: Record<ObstacleCategory, number> = {
  1: 0, 2: 1, 3: 0, 4: 2, 5: 3, 6: 1, 7: 0, 8: 2, 9: 0,
}

export function resolveFurnitureBlock(category: ObstacleCategory, blocks: 1 | 2 | 3, variant: number) {
  const choices = blocks === 1 ? oneBlockSprites : blocks === 2 ? twoBlockSprites : threeBlockSprites
  return choices[(variant + categoryOffsets[category]) % choices.length]
}

export function furnitureBlockSpriteCount(blocks: 1 | 2 | 3) {
  return blocks === 1 ? oneBlockSprites.length : blocks === 2 ? twoBlockSprites.length : threeBlockSprites.length
}

import type { AtlasRect } from './petSprites'

export const COLLECTIBLE_ATLAS_SIZE = { width: 1254, height: 1254 } as const

export const YELLOW_PELLET_COLOR = '#f6df78'
export const GREY_PELLET_COLOR = '#555555'

const LIGHT_FLOOR_THEMES = new Set([1, 7])

export type ItemSpriteDefinition = {
  id: string
  rect: AtlasRect
}

export const ITEM_SPRITES = [
  { id: 'baseball', rect: [28, 624, 51, 53] },
  { id: 'tennis-ball', rect: [104, 624, 50, 53] },
  { id: 'golf-ball', rect: [180, 624, 49, 53] },
  { id: 'beach-ball', rect: [250, 625, 49, 50] },
  { id: 'toy-ball', rect: [324, 626, 47, 49] },
  { id: 'lightning-ball', rect: [398, 628, 43, 47] },
  { id: 'jacks', rect: [460, 623, 55, 60] },
  { id: 'white-die', rect: [533, 624, 54, 58] },
  { id: 'red-die', rect: [600, 623, 54, 60] },
  { id: 'puzzle-piece', rect: [675, 624, 64, 63] },
  { id: 'key', rect: [754, 620, 59, 66] },
  { id: 'coin', rect: [837, 624, 54, 56] },
  { id: 'ring', rect: [918, 621, 50, 62] },
  { id: 'bone', rect: [988, 622, 53, 59] },
  { id: 'tire', rect: [1060, 627, 69, 56] },
  { id: 'stethoscope', rect: [1154, 624, 58, 60] },
] as const satisfies readonly ItemSpriteDefinition[]

export function pelletColor(theme: number) {
  return LIGHT_FLOOR_THEMES.has(theme) ? GREY_PELLET_COLOR : YELLOW_PELLET_COLOR
}

export function fitItemSprite(rect: AtlasRect, centerX: number, centerY: number, maxSize: number) {
  const scale = maxSize / Math.max(rect[2], rect[3])
  const width = rect[2] * scale
  const height = rect[3] * scale
  return { x: centerX - width / 2, y: centerY - height / 2, width, height }
}

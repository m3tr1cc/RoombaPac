import type { Direction } from './types'

export type AtlasRect = readonly [x: number, y: number, width: number, height: number]

export type PetSpriteFrame = {
  rect: AtlasRect
  anchor: readonly [x: number, y: number]
  referenceHeight: number
}

type SourceDirection = Exclude<Direction, 'left'>
type FramePair = readonly [PetSpriteFrame, PetSpriteFrame]
type PetSpriteSet = Record<SourceDirection, FramePair>

export const PET_ATLAS_URL = '/assets/game/roombapac-pets.png'
export const PET_ATLAS_SIZE = { width: 816, height: 640 } as const
export const PET_SPRITE_CELL = { width: 136, height: 128 } as const

const FRAME_ANCHOR = [PET_SPRITE_CELL.width / 2, PET_SPRITE_CELL.height / 2] as const

function spriteFrame(petId: number, column: number, referenceHeight: number): PetSpriteFrame {
  return {
    rect: [column * PET_SPRITE_CELL.width, petId * PET_SPRITE_CELL.height, PET_SPRITE_CELL.width, PET_SPRITE_CELL.height],
    anchor: FRAME_ANCHOR,
    referenceHeight,
  }
}

function spriteSet(petId: number, referenceHeight: number): PetSpriteSet {
  return {
    down: [spriteFrame(petId, 0, referenceHeight), spriteFrame(petId, 1, referenceHeight)],
    up: [spriteFrame(petId, 2, referenceHeight), spriteFrame(petId, 3, referenceHeight)],
    right: [spriteFrame(petId, 4, referenceHeight), spriteFrame(petId, 5, referenceHeight)],
  }
}

export const PET_SPRITES = [
  spriteSet(0, 101),
  spriteSet(1, 105),
  spriteSet(2, 104),
  spriteSet(3, 104),
  spriteSet(4, 104),
] as const satisfies readonly PetSpriteSet[]

export function resolvePetSprite(petId: number, direction: Direction, animationFrame: number) {
  const sprites = PET_SPRITES[petId]
  if (!sprites) throw new RangeError(`Unknown pet sprite: ${petId}`)

  const sourceDirection = direction === 'left' ? 'right' : direction
  return {
    frame: sprites[sourceDirection][animationFrame & 1],
    flipX: direction === 'left',
  }
}

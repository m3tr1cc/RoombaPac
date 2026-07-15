import type { Direction } from './types'

type AtlasRect = readonly [number, number, number, number]

export type RoombaSpriteFrame = {
  rect: AtlasRect
  anchor: readonly [number, number]
  referenceHeight: number
}

type RoombaAnimation = readonly [RoombaSpriteFrame, RoombaSpriteFrame, RoombaSpriteFrame, RoombaSpriteFrame]

export const ROOMBA_ATLAS_URL = '/assets/game/roombapac-roomba.png'
export const ROOMBA_ATLAS_SIZE = { width: 384, height: 384 } as const

const CELL_SIZE = 96
const FRAME_OFFSET = { x: 4, y: 2 } as const
const FRAME_SIZE = { width: 88, height: 92 } as const

function spriteFrame(row: number, column: number): RoombaSpriteFrame {
  return {
    rect: [
      column * CELL_SIZE + FRAME_OFFSET.x,
      row * CELL_SIZE + FRAME_OFFSET.y,
      FRAME_SIZE.width,
      FRAME_SIZE.height,
    ],
    anchor: [FRAME_SIZE.width / 2, FRAME_SIZE.height / 2],
    referenceHeight: FRAME_SIZE.height,
  }
}

function animation(row: number): RoombaAnimation {
  return [spriteFrame(row, 0), spriteFrame(row, 1), spriteFrame(row, 2), spriteFrame(row, 3)]
}

export const ROOMBA_SPRITES: Record<Direction, RoombaAnimation> = {
  up: animation(0),
  right: animation(1),
  down: animation(2),
  left: animation(3),
}

export function resolveRoombaSprite(direction: Direction, animationFrame: number): RoombaSpriteFrame {
  const frameCount = ROOMBA_SPRITES[direction].length
  const frameIndex = ((Math.trunc(animationFrame) % frameCount) + frameCount) % frameCount
  return ROOMBA_SPRITES[direction][frameIndex]
}

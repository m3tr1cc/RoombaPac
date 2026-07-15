import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROOMBA_ATLAS_SIZE, ROOMBA_SPRITES, resolveRoombaSprite } from './roombaSprites'
import type { Direction } from './types'

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

describe('roomba sprite atlas', () => {
  it('matches the dimensions declared by the sprite metadata', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/assets/game/roombapac-roomba.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(ROOMBA_ATLAS_SIZE.width)
    expect(png.readUInt32BE(20)).toBe(ROOMBA_ATLAS_SIZE.height)
  })

  it('keeps every frame and anchor inside the atlas', () => {
    for (const direction of DIRECTIONS) {
      for (const frame of ROOMBA_SPRITES[direction]) {
        const [x, y, width, height] = frame.rect
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x + width).toBeLessThanOrEqual(ROOMBA_ATLAS_SIZE.width)
        expect(y + height).toBeLessThanOrEqual(ROOMBA_ATLAS_SIZE.height)
        expect(frame.anchor[0]).toBeGreaterThanOrEqual(0)
        expect(frame.anchor[0]).toBeLessThanOrEqual(width)
        expect(frame.anchor[1]).toBeGreaterThanOrEqual(0)
        expect(frame.anchor[1]).toBeLessThanOrEqual(height)
        expect(frame.referenceHeight).toBeGreaterThan(0)
      }
    }
  })

  it('uses four dedicated cells for every direction', () => {
    const rects = DIRECTIONS.flatMap((direction) => ROOMBA_SPRITES[direction].map((frame) => frame.rect.join(',')))
    expect(new Set(rects)).toHaveLength(DIRECTIONS.length * 4)
  })

  it('wraps animation frames deterministically', () => {
    for (const direction of DIRECTIONS) {
      expect(resolveRoombaSprite(direction, 4)).toBe(ROOMBA_SPRITES[direction][0])
      expect(resolveRoombaSprite(direction, 5)).toBe(ROOMBA_SPRITES[direction][1])
      expect(resolveRoombaSprite(direction, -1)).toBe(ROOMBA_SPRITES[direction][3])
    }
  })
})

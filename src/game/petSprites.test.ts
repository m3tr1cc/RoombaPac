import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PET_ATLAS_SIZE, PET_SPRITES, resolvePetSprite } from './petSprites'
import type { Direction } from './types'

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

describe('pet sprite atlas', () => {
  it('matches the dimensions declared by the sprite metadata', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/assets/game/roombapac-pets.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(PET_ATLAS_SIZE.width)
    expect(png.readUInt32BE(20)).toBe(PET_ATLAS_SIZE.height)
  })

  it('keeps every frame and anchor inside the atlas', () => {
    for (const sprites of PET_SPRITES) {
      for (const direction of ['up', 'right', 'down'] as const) {
        for (const frame of sprites[direction]) {
          const [x, y, width, height] = frame.rect
          expect(x).toBeGreaterThanOrEqual(0)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(x + width).toBeLessThanOrEqual(PET_ATLAS_SIZE.width)
          expect(y + height).toBeLessThanOrEqual(PET_ATLAS_SIZE.height)
          expect(frame.anchor[0]).toBeGreaterThanOrEqual(0)
          expect(frame.anchor[0]).toBeLessThanOrEqual(width)
          expect(frame.anchor[1]).toBeGreaterThanOrEqual(0)
          expect(frame.anchor[1]).toBeLessThanOrEqual(height)
          expect(frame.referenceHeight).toBeGreaterThan(0)
        }
      }
    }
  })

  it('uses two distinct animation cells for every pet and source direction', () => {
    for (const sprites of PET_SPRITES) {
      for (const direction of ['up', 'right', 'down'] as const) {
        expect(sprites[direction][0].rect).not.toEqual(sprites[direction][1].rect)
      }
    }
  })

  it('uses right-facing source art and mirrors only leftward movement', () => {
    for (let petId = 0; petId < PET_SPRITES.length; petId += 1) {
      for (const frameIndex of [0, 1]) {
        const right = resolvePetSprite(petId, 'right', frameIndex)
        const left = resolvePetSprite(petId, 'left', frameIndex)
        expect(right.flipX).toBe(false)
        expect(left.flipX).toBe(true)
        expect(left.frame).toBe(right.frame)
      }
    }
  })

  it('never mirrors dedicated vertical frames', () => {
    for (let petId = 0; petId < PET_SPRITES.length; petId += 1) {
      for (const direction of DIRECTIONS.filter((value) => value === 'up' || value === 'down')) {
        for (const frameIndex of [0, 1]) expect(resolvePetSprite(petId, direction, frameIndex).flipX).toBe(false)
      }
    }
  })
})

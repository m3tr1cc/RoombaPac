import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COLLECTIBLE_ATLAS_SIZE,
  fitItemSprite,
  GREY_PELLET_COLOR,
  ITEM_SPRITES,
  pelletColor,
  YELLOW_PELLET_COLOR,
} from './collectibleSprites'

describe('collectible rendering metadata', () => {
  it('uses grey pellets only on the two brightest floor themes', () => {
    expect(Array.from({ length: 9 }, (_, theme) => pelletColor(theme))).toEqual([
      YELLOW_PELLET_COLOR,
      GREY_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
      GREY_PELLET_COLOR,
      YELLOW_PELLET_COLOR,
    ])
  })

  it('matches the production atlas and keeps every complete item crop inside it', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/assets/game/roombapac-atlas.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(COLLECTIBLE_ATLAS_SIZE.width)
    expect(png.readUInt32BE(20)).toBe(COLLECTIBLE_ATLAS_SIZE.height)
    expect(ITEM_SPRITES).toHaveLength(16)
    expect(new Set(ITEM_SPRITES.map(({ id }) => id)).size).toBe(ITEM_SPRITES.length)
    expect(new Set(ITEM_SPRITES.map(({ rect }) => rect.join(','))).size).toBe(ITEM_SPRITES.length)

    for (const { rect } of ITEM_SPRITES) {
      const [x, y, width, height] = rect
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(x + width).toBeLessThanOrEqual(COLLECTIBLE_ATLAS_SIZE.width)
      expect(y + height).toBeLessThanOrEqual(COLLECTIBLE_ATLAS_SIZE.height)
    }
  })

  it('centers and aspect-fits every item into a fixed square', () => {
    for (const { rect } of ITEM_SPRITES) {
      const fitted = fitItemSprite(rect, 50, 75, 40)
      expect(Math.max(fitted.width, fitted.height)).toBeCloseTo(40)
      expect(fitted.width / fitted.height).toBeCloseTo(rect[2] / rect[3])
      expect(fitted.x + fitted.width / 2).toBeCloseTo(50)
      expect(fitted.y + fitted.height / 2).toBeCloseTo(75)
      expect(fitItemSprite(rect, 50, 75, 40)).toEqual(fitted)
    }
  })
})

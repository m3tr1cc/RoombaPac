import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FURNITURE_ATLAS_SIZE,
  FURNITURE_SPRITES,
  PLACEABLE_FURNITURE_SPRITES,
  furnitureSpriteCount,
  resolveFurnitureSprite,
} from './furnitureSprites'

function pngSize(bytes: Buffer) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('furniture sprite catalog', () => {
  it('matches the production atlas and catalogs a broad obstacle set', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/assets/game/roombapac-furniture.png'))
    expect(pngSize(png)).toEqual(FURNITURE_ATLAS_SIZE)
    expect(furnitureSpriteCount()).toBe(FURNITURE_SPRITES.length)
    expect(FURNITURE_SPRITES.length).toBeGreaterThanOrEqual(70)
    expect(new Set(FURNITURE_SPRITES.map(({ family }) => family)).size).toBeGreaterThanOrEqual(12)
  })

  it('keeps every crop, footprint, and mask valid', () => {
    const ids = new Set<string>()
    for (const definition of FURNITURE_SPRITES) {
      expect(ids.has(definition.id)).toBe(false)
      ids.add(definition.id)
      expect(resolveFurnitureSprite(definition.id)).toBe(definition)

      const [x, y, width, height] = definition.rect
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + width).toBeLessThanOrEqual(FURNITURE_ATLAS_SIZE.width)
      expect(y + height).toBeLessThanOrEqual(FURNITURE_ATLAS_SIZE.height)

      const [blocksWide, blocksHigh] = definition.footprint
      expect(blocksWide).toBeGreaterThan(0)
      expect(blocksHigh).toBeGreaterThan(0)
      expect(definition.mask).toHaveLength(blocksHigh)
      definition.mask.forEach((row) => expect(row).toMatch(new RegExp(`^[01]{${blocksWide}}$`)))
      expect(definition.mask.join('')).toContain('1')
      expect(definition.rotations.length).toBeGreaterThan(0)
      definition.rotations.forEach((rotation) => expect([0, 1, 2, 3]).toContain(rotation))
    }
  })

  it('provides varied one-cell fallbacks without relying on chairs', () => {
    const oneCell = PLACEABLE_FURNITURE_SPRITES.filter(({ footprint, mask }) => (
      footprint[0] === 1 && footprint[1] === 1 && mask[0] === '1'
    ))
    expect(oneCell.length).toBeGreaterThanOrEqual(20)
    expect([...new Set(oneCell.map(({ family }) => family))]).toEqual(expect.arrayContaining(['chair', 'cabinet', 'table', 'appliance', 'plant', 'sofa']))
    expect(oneCell.filter(({ family }) => family === 'chair').length / oneCell.length).toBeLessThan(0.5)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FURNITURE_ATLAS_SIZE,
  FURNITURE_REFERENCE_CELL,
  FURNITURE_SPRITES,
  PET_CAGE_SPRITE,
  PLACEABLE_FURNITURE_SPRITES,
  furnitureSpriteCount,
  resolveBoundarySprite,
  resolveFurnitureSprite,
  resolveFurnitureFrame,
} from './furnitureSprites'

function pngSize(bytes: Buffer) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('furniture sprite catalog', () => {
  it('matches the production atlas and catalogs a broad obstacle set', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/assets/game/roombapac-furniture-v2.png'))
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

      const [blocksWide, blocksHigh] = definition.footprint
      expect(blocksWide).toBeGreaterThan(0)
      expect(blocksHigh).toBeGreaterThan(0)
      expect(definition.mask).toHaveLength(blocksHigh)
      definition.mask.forEach((row) => expect(row).toMatch(new RegExp(`^[01]{${blocksWide}}$`)))
      expect(definition.mask.join('')).toContain('1')
      expect(definition.rotations.length).toBeGreaterThan(0)
      definition.rotations.forEach((rotation) => expect([0, 1, 2, 3]).toContain(rotation))

      expect(definition.frames).toHaveLength(4)
      for (const rotation of [0, 1, 2, 3] as const) {
        const frame = resolveFurnitureFrame(definition.id, rotation)
        expect(frame).toBe(definition.frames[rotation])
        const [x, y, width, height] = frame.rect
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x + width).toBeLessThanOrEqual(FURNITURE_ATLAS_SIZE.width)
        expect(y + height).toBeLessThanOrEqual(FURNITURE_ATLAS_SIZE.height)

        const sideways = rotation % 2 === 1
        expect(frame.referenceSize).toEqual([
          (sideways ? blocksHigh : blocksWide) * FURNITURE_REFERENCE_CELL,
          (sideways ? blocksWide : blocksHigh) * FURNITURE_REFERENCE_CELL,
        ])
        expect(frame.anchor).toEqual([frame.referenceSize[0] / 2, frame.referenceSize[1] / 2])
        expect(frame.authored).toBe(true)

        const [left, top, right, bottom] = frame.opaqueBounds
        const [referenceWidth, referenceHeight] = frame.referenceSize
        expect(left).toBeGreaterThanOrEqual(3)
        expect(top).toBeGreaterThanOrEqual(3)
        expect(right).toBeLessThanOrEqual(referenceWidth - 3)
        expect(bottom).toBeLessThanOrEqual(referenceHeight - 3)

        const visibleWidth = right - left
        const visibleHeight = bottom - top
        expect(visibleWidth / referenceWidth).toBeGreaterThanOrEqual(referenceWidth > referenceHeight ? 0.65 : 0.35)
        expect(visibleHeight / referenceHeight).toBeGreaterThanOrEqual(referenceHeight > referenceWidth ? 0.65 : 0.35)
      }

      if (definition.collisionEligible) {
        expect(new Set(definition.frames.map(({ rect }) => rect.join(','))).size).toBe(4)
      }
    }
  })

  it('builds every direction from authored masters instead of bitmap rotation', () => {
    const builder = readFileSync(resolve(process.cwd(), 'scripts/build_furniture_atlas.py'), 'utf8')
    expect(builder).not.toMatch(/legacy_orientations|Image\.Transpose\.ROTATE/)
    expect(builder).not.toMatch(/source_atlas\.crop/)
  })

  it('provides varied one-cell fallbacks without relying on chairs', () => {
    const oneCell = PLACEABLE_FURNITURE_SPRITES.filter(({ footprint, mask }) => (
      footprint[0] === 1 && footprint[1] === 1 && mask[0] === '1'
    ))
    expect(oneCell.length).toBeGreaterThanOrEqual(20)
    expect([...new Set(oneCell.map(({ family }) => family))]).toEqual(expect.arrayContaining(['chair', 'cabinet', 'table', 'appliance', 'plant', 'sofa']))
    expect(oneCell.filter(({ family }) => family === 'chair').length / oneCell.length).toBeLessThan(0.5)
  })

  it('provides normalized cage and authored boundary-side frames', () => {
    expect(PET_CAGE_SPRITE.frame.referenceSize).toEqual([
      PET_CAGE_SPRITE.footprint[0] * FURNITURE_REFERENCE_CELL,
      PET_CAGE_SPRITE.footprint[1] * FURNITURE_REFERENCE_CELL,
    ])

    for (let variant = 0; variant < 4; variant += 1) {
      const frames = ([0, 1, 2, 3] as const).map((side) => resolveBoundarySprite(variant, side))
      expect(frames.every(({ referenceSize }) => (
        referenceSize[0] === FURNITURE_REFERENCE_CELL
        && referenceSize[1] === FURNITURE_REFERENCE_CELL
      ))).toBe(true)
      expect(new Set(frames.map(({ rect }) => rect.join(','))).size).toBe(4)
    }
  })
})

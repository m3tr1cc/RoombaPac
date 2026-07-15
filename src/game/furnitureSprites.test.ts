import { describe, expect, it } from 'vitest'
import { furnitureBlockSpriteCount, furnitureSpriteCount, resolveFurnitureBlock, resolveFurnitureSprite } from './furnitureSprites'
import type { ObstacleCategory } from './types'

describe('furniture sprite manifest', () => {
  it('keeps every category inside the production atlas', () => {
    for (let category = 1; category <= 9; category += 1) {
      const typedCategory = category as ObstacleCategory
      expect(furnitureSpriteCount(typedCategory)).toBeGreaterThan(0)
      for (let variant = 0; variant < furnitureSpriteCount(typedCategory); variant += 1) {
        const { rect, referenceWidth, referenceHeight } = resolveFurnitureSprite(typedCategory, variant)
        expect(rect[0]).toBeGreaterThanOrEqual(0)
        expect(rect[1]).toBeGreaterThanOrEqual(0)
        expect(rect[0] + rect[2]).toBeLessThanOrEqual(1536)
        expect(rect[1] + rect[3]).toBeLessThanOrEqual(1024)
        expect(referenceWidth).toBeGreaterThan(0)
        expect(referenceHeight).toBeGreaterThan(0)
      }
    }
  })

  it('provides exact one-, two-, and three-cell building blocks', () => {
    for (const blocks of [1, 2, 3] as const) {
      expect(furnitureBlockSpriteCount(blocks)).toBeGreaterThan(0)
      for (let category = 1; category <= 9; category += 1) {
        const sprite = resolveFurnitureBlock(category as ObstacleCategory, blocks, category)
        expect(sprite.blocks).toBe(blocks)
        expect(sprite.referenceWidth).toBe(blocks)
        expect(sprite.referenceHeight).toBe(1)
      }
    }
  })
})

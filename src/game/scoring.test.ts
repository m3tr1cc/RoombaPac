import { describe, expect, it } from 'vitest'
import { calculateScore, frightenedDuration, petSpeed, roombaSpeed } from './scoring'

describe('game rules', () => {
  it('uses the approved flat scoring values', () => {
    expect(calculateScore({ dots: 11, items: 2, pets: 3 })).toBe(9100)
  })

  it('raises both speeds while pets catch up over time', () => {
    expect(roombaSpeed(10)).toBeGreaterThan(roombaSpeed(1))
    expect(petSpeed(10)).toBeGreaterThan(petSpeed(1))
    expect(petSpeed(20) / roombaSpeed(20)).toBeGreaterThan(petSpeed(1) / roombaSpeed(1))
  })

  it('shortens frightened time without dropping below the safety floor', () => {
    expect(frightenedDuration(8)).toBeLessThan(frightenedDuration(1))
    expect(frightenedDuration(100)).toBe(2500)
  })
})

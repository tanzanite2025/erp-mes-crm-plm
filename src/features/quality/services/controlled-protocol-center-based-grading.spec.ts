import { describe, expect, it } from 'vitest'
import { standardItemSchema } from '../data/schema'
import {
  buildCenterBasedControlledProtocolLevels,
  hasValidControlledProtocolDeviationLimits,
} from './controlled-protocol-center-based-grading'

describe('controlled protocol center-based grade contract', () => {
  it.each([
    [450, 'S'],
    [449.999, 'A'],
    [450.001, 'A'],
    [445, 'A'],
    [455, 'A'],
    [444.999, 'B'],
    [455.001, 'B'],
    [440, 'B'],
    [460, 'B'],
    [439.999, 'SCRAP'],
    [460.001, 'SCRAP'],
  ])(
    'represents measurement %s as exactly %s, including shared boundaries',
    (measurement, expectedGrade) => {
      const item = standardItemSchema.parse({
        id: 'weight-criterion',
        name: '成品重量',
        centerValue: 450,
        levels: buildCenterBasedControlledProtocolLevels(450, 5, 10),
      })
      const deviation = Math.abs(measurement - item.centerValue!)
      // Interpret the persisted contract independently; no two grades may match.
      const matches = item.levels.filter(
        (level) =>
          measurement >= level.min! &&
          measurement <= level.max! &&
          (level.deviationMinExclusive === undefined ||
            deviation > level.deviationMinExclusive)
      )
      expect(matches.map((level) => level.level)).toEqual(
        expectedGrade === 'SCRAP' ? [] : [expectedGrade]
      )
    }
  )

  it.each([
    [450, 0, 10],
    [450, -5, 10],
    [450, 5, 5],
    [450, 10, 5],
    [Infinity, 5, 10],
    [450, NaN, 10],
    [450, 5, Infinity],
    [450, 5, -Infinity],
    [Number.MAX_VALUE, 5, 10],
  ])(
    'rejects invalid or unrepresentable center/A/B limits %s/%s/%s',
    (center, a, b) => {
      expect(hasValidControlledProtocolDeviationLimits(center, a, b)).toBe(
        false
      )
      expect(() =>
        buildCenterBasedControlledProtocolLevels(center, a, b)
      ).toThrow(RangeError)
    }
  )

  it('supports a zero center and decimal tolerances', () => {
    expect(hasValidControlledProtocolDeviationLimits(0, 0.05, 0.1)).toBe(true)
    expect(
      buildCenterBasedControlledProtocolLevels(0, 0.05, 0.1)
    ).toMatchObject([
      { level: 'S', min: 0, max: 0 },
      { level: 'A', min: -0.05, max: 0.05, deviationMinExclusive: 0 },
      { level: 'B', min: -0.1, max: 0.1, deviationMinExclusive: 0.05 },
    ])
  })
})

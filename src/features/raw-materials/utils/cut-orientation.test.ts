import { describe, expect, it } from 'vitest'
import {
  normalizeCutAngleDegrees,
  resolveSupportedCutAngleValue,
  resolveCutOrientationGeometry,
  toCutAngleDegrees,
} from './cut-orientation'

describe('cut-orientation', () => {
  it('keeps geometric normalization but only resolves 0 and 45 as supported business angles', () => {
    expect(normalizeCutAngleDegrees(45)).toBe(45)
    expect(normalizeCutAngleDegrees(180)).toBe(0)
    expect(toCutAngleDegrees('45')).toBe(45)
    expect(resolveSupportedCutAngleValue('45')).toBe('45')
    expect(resolveSupportedCutAngleValue('90')).toBe('0')
    expect(resolveSupportedCutAngleValue('135')).toBe('0')
    expect(resolveSupportedCutAngleValue('13')).toBe('0')
  })

  it('keeps 0 degree envelope equal to the base size', () => {
    const geometry = resolveCutOrientationGeometry({
      widthMm: 980,
      lengthMm: 91,
      cutAngleDeg: 0,
    })

    expect(geometry.envelopeWidthMm).toBe(980)
    expect(geometry.envelopeLengthMm).toBe(91)
    expect(geometry.baseAreaM2).toBe(0.08918)
    expect(geometry.envelopeAreaM2).toBe(0.08918)
  })

  it('expands the occupied envelope for 45 degree bias cuts', () => {
    const geometry = resolveCutOrientationGeometry({
      widthMm: 980,
      lengthMm: 91,
      cutAngleDeg: 45,
    })

    expect(geometry.envelopeWidthMm).toBe(757.311)
    expect(geometry.envelopeLengthMm).toBe(757.311)
    expect(geometry.envelopeAreaM2).toBeGreaterThan(geometry.baseAreaM2)
  })
})

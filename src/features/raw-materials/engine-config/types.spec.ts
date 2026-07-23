import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  normalizeCuttingEngineConfig,
} from './types'

describe('normalizeCuttingEngineConfig', () => {
  it('falls back invalid numeric values to safe defaults', () => {
    const config = normalizeCuttingEngineConfig({
      splitPenaltyWeight: 'bad',
      mustFulfillPenaltyWeight: '10abc',
      knifeGapMm: '-1',
      edgeTrimMm: '-2',
      maxSolveDurationSeconds: '0',
      minSupportedLengthMm: 'abc',
    })

    expect(config.splitPenaltyWeight).toBe(
      DEFAULT_CUTTING_ENGINE_CONFIG.splitPenaltyWeight
    )
    expect(config.knifeGapMm).toBe(DEFAULT_CUTTING_ENGINE_CONFIG.knifeGapMm)
    expect(config.mustFulfillPenaltyWeight).toBe(
      DEFAULT_CUTTING_ENGINE_CONFIG.mustFulfillPenaltyWeight
    )
    expect(config.edgeTrimMm).toBe(DEFAULT_CUTTING_ENGINE_CONFIG.edgeTrimMm)
    expect(config.maxSolveDurationSeconds).toBe(
      DEFAULT_CUTTING_ENGINE_CONFIG.maxSolveDurationSeconds
    )
    expect(config.minSupportedLengthMm).toBe(
      DEFAULT_CUTTING_ENGINE_CONFIG.minSupportedLengthMm
    )
  })

  it('keeps length boundaries and fixed decision length internally consistent', () => {
    const config = normalizeCuttingEngineConfig({
      minSupportedLengthMm: '150',
      maxSupportedLengthMm: '120',
      fixedDecisionLengthMm: '91',
    })

    expect(config.minSupportedLengthMm).toBe('150')
    expect(config.maxSupportedLengthMm).toBe('150')
    expect(config.fixedDecisionLengthMm).toBe('150')
  })

  it('allows zero where the engine uses it as a disabled penalty', () => {
    const config = normalizeCuttingEngineConfig({
      splitPenaltyWeight: '0',
      mustFulfillPenaltyWeight: '0',
      directionSwitchPenaltyWeight: '0',
      edgeTrimMm: '0',
    })

    expect(config.splitPenaltyWeight).toBe('0')
    expect(config.mustFulfillPenaltyWeight).toBe('0')
    expect(config.directionSwitchPenaltyWeight).toBe('0')
    expect(config.edgeTrimMm).toBe('0')
  })
})

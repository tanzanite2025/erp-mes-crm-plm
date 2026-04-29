import { describe, expect, it } from 'vitest'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BatchEngineControls } from '../types'
import { resolveBatchEngineControls } from './resolve-batch-engine-controls'

function buildControls(overrides: Partial<BatchEngineControls> = {}): BatchEngineControls {
  return {
    selectedPrepregSpecId: 'prepreg-1',
    selectedCuttingPlanId: 'plan-1',
    rollWidthMm: '980',
    rollLengthM: '12',
    knifeGapMm: '2.5',
    edgeTrimMm: '5',
    objectivePreset: 'yield-first',
    fulfilledWeight: '35',
    utilizationWeight: '55',
    stabilityWeight: '10',
    assignmentPenaltyWeight: '4',
    unfulfilledPenaltyWeight: '12',
    splitPenaltyWeight: '6',
    mustPenaltyWeight: '45',
    ...overrides,
  }
}

describe('resolveBatchEngineControls', () => {
  it('falls back to raw controls when no prepreg spec is selected', () => {
    const result = resolveBatchEngineControls(buildControls(), undefined)

    expect(result.resolvedControls.rollWidthMm).toBe('980')
    expect(result.resolvedControls.rollLengthM).toBe('12')
    expect(result.normalizedControls.rollWidthMm).toBe(980)
    expect(result.normalizedControls.rollLengthM).toBe(12)
    expect(result.normalizedControls.knifeGapMm).toBe(2.5)
    expect(result.normalizedControls.mustPenaltyWeight).toBe(45)
  })

  it('uses selected prepreg spec dimensions as resolved display and normalized values', () => {
    const result = resolveBatchEngineControls(
      buildControls({ rollWidthMm: '980', rollLengthM: '12' }),
      {
        id: 'prepreg-1',
        widthMm: ' 1250 ',
        lengthM: ' 20 ',
      } as PrepregMaterialSpec
    )

    expect(result.resolvedControls.rollWidthMm).toBe('1250')
    expect(result.resolvedControls.rollLengthM).toBe('20')
    expect(result.normalizedControls.rollWidthMm).toBe(1250)
    expect(result.normalizedControls.rollLengthM).toBe(20)
    expect(result.rawControls.rollWidthMm).toBe('980')
    expect(result.rawControls.rollLengthM).toBe('12')
  })
})

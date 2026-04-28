import { describe, expect, it } from 'vitest'
import { buildBatchEngineDemandLinesFromCuttingPlan } from './build-batch-engine-demand-lines-from-cutting-plan'
import { buildBatchEnginePreview } from './build-batch-engine-preview'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineControls } from '../types'

function buildCutSizeUnit(overrides: Partial<CutSizeUnit> = {}): CutSizeUnit {
  return {
    id: 'unit-1',
    code: 'CUT-980-91',
    name: 'Cut Unit',
    widthMm: '980',
    lengthMm: '91',
    pieceCount: '1',
    areaM2: '',
    areaWeightGsm: '260',
    weightG: '',
    cutAngle: '0',
    layupCount: '1',
    layupMode: '',
    usageType: 'default',
    edgeTrimMm: '0',
    stepOffsetMm: '0',
    lossFactor: '',
    notes: '',
    status: 'Active',
    version: 1,
    ...overrides,
  }
}

function buildCuttingPlan(): CuttingPlan {
  return {
    id: 'plan-1',
    name: 'Plan 1',
    productId: '',
    productCode: '',
    productName: '',
    holeCount: '',
    documentNo: '',
    revisionNo: 'A1',
    effectiveDate: '',
    carbonFiberModel: '',
    resinModel: '',
    resinContentPercent: '',
    prepregSpecId: '',
    prepregSpecLabel: '',
    totalInnerMaterialWeightG: '',
    totalMaterialWeightG: '',
    status: 'Active',
    version: 1,
    lines: [
      {
        id: 'line-1',
        sequenceNo: 1,
        rollOrder: '',
        yarnDirection: '',
        cutSizeId: 'unit-1',
        cutSizeCode: 'CUT-980-91',
        cutSizeName: 'Cut Unit',
        sizeExpression: '980x91x1',
        requiredSets: '1',
        priority: '1',
        mustFulfill: true,
        allowMixedPlan: false,
        faw: '',
        weightG: '',
        areaM2: '',
        operationNote: '',
        constraintProfile: {
          rollGroupKey: '',
          orderSequence: '',
          yarnDirectionMode: '',
          processTags: [],
          noteKeywords: [],
        },
        manualGroupBreakBefore: false,
      },
    ],
    createdAt: '',
  }
}

function buildControls(overrides: Partial<BatchEngineControls> = {}): BatchEngineControls {
  return {
    selectedPrepregSpecId: 'prepreg-1',
    selectedCuttingPlanId: 'plan-1',
    rollWidthMm: '1000',
    rollLengthM: '2',
    knifeGapMm: '0',
    edgeTrimMm: '0',
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

describe('buildBatchEnginePreview', () => {
  it('uses occupied envelope geometry for bias-cut capacity while preserving actual demand area', () => {
    const cuttingPlan = buildCuttingPlan()
    const controls = buildControls()

    const zeroDegreeLines = buildBatchEngineDemandLinesFromCuttingPlan(cuttingPlan, [
      buildCutSizeUnit({ cutAngle: '0' }),
    ])
    const biasLines = buildBatchEngineDemandLinesFromCuttingPlan(cuttingPlan, [
      buildCutSizeUnit({ cutAngle: '45' }),
    ])

    const zeroDegreePreview = buildBatchEnginePreview(cuttingPlan, zeroDegreeLines, controls)
    const biasPreview = buildBatchEnginePreview(cuttingPlan, biasLines, controls)

    expect(zeroDegreePreview.ready).toBe(true)
    expect(biasPreview.ready).toBe(true)
    expect(zeroDegreePreview.totalDemandAreaM2).toBe(0.089)
    expect(biasPreview.totalDemandAreaM2).toBe(0.089)
    expect(biasPreview.totalOccupiedAreaM2).toBeGreaterThan(biasPreview.totalDemandAreaM2)
    expect(zeroDegreePreview.piecesPerStrip).toBeGreaterThan(biasPreview.piecesPerStrip)
    expect(zeroDegreePreview.lossAreaM2).toBeGreaterThan(biasPreview.lossAreaM2)
    expect(zeroDegreePreview.utilizationPercent).toBeLessThan(biasPreview.utilizationPercent)
  })
})

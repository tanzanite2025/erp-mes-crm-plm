import { describe, expect, it } from 'vitest'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { buildBatchEngineDemandLinesFromCuttingPlan } from './build-batch-engine-demand-lines-from-cutting-plan'

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
    notes: '',
    status: 'Active',
    version: 1,
    ...overrides,
  }
}

function buildCuttingPlan(lineOverrides: Record<string, unknown> = {}): CuttingPlan {
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
        requiredSets: '2',
        priority: '',
        mustFulfill: undefined,
        allowMixedPlan: undefined,
        faw: '',
        weightG: '',
        areaM2: '',
        operationNote: '',
        constraintProfile: {
          rollGroupKey: 'group-a',
          orderSequence: '7',
          yarnDirectionMode: 'weft',
          processTags: [' no-mix ', ' tag-a '],
          noteKeywords: [' optional ', ' key-a '],
        },
        manualGroupBreakBefore: false,
        ...lineOverrides,
      } as never,
    ],
    createdAt: '',
  }
}

describe('buildBatchEngineDemandLinesFromCuttingPlan', () => {
  it('marks lines invalid when cut size reference is missing', () => {
    const result = buildBatchEngineDemandLinesFromCuttingPlan(
      buildCuttingPlan({ cutSizeId: '' }),
      [buildCutSizeUnit()]
    )

    expect(result.validLines).toHaveLength(0)
    expect(result.invalidLines).toHaveLength(1)
    expect(result.invalidLines[0]?.reason).toBe('未绑定尺寸单元')
  })

  it('derives rules and maps a valid cutting plan line into a resolved demand line', () => {
    const result = buildBatchEngineDemandLinesFromCuttingPlan(
      buildCuttingPlan(),
      [buildCutSizeUnit({ usageType: 'warp' })]
    )

    expect(result.invalidLines).toHaveLength(0)
    expect(result.validLines).toHaveLength(1)
    expect(result.validLines[0]).toMatchObject({
      demandLineId: 'line-1',
      cutSizeUnitId: 'unit-1',
      requiredSets: 2,
      requiredPieces: 2,
      priority: 9993,
      allowMixedPlan: true,
      mustFulfill: true,
      usageType: 'weft',
      rollGroupKey: 'group-a',
      orderSequence: 7,
      yarnDirectionMode: 'weft',
      processTags: ['no-mix', 'tag-a'],
      noteKeywords: ['optional', 'key-a'],
    })
  })
})

import { describe, expect, it } from 'vitest'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { buildBatchEngineSolveRequest } from './build-batch-engine-solve-request'
import { resolveBatchEngineControls } from './resolve-batch-engine-controls'

function buildControls(overrides: Partial<BatchEngineControls> = {}): BatchEngineControls {
  return {
    selectedPrepregSpecId: 'prepreg-1',
    selectedCuttingPlanId: 'cutting-plan-1',
    rollWidthMm: '1200',
    rollLengthM: '15',
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

function buildSimulation(overrides: Partial<BatchEngineSimulation> = {}): BatchEngineSimulation {
  return {
    ready: true,
    selectedPlanName: 'plan-a',
    demandLineCount: 1,
    validDemandLineCount: 1,
    invalidDemandLineCount: 0,
    totalRequiredSets: 3,
    totalRequiredPieces: 6,
    totalDemandAreaM2: 1.2,
    totalOccupiedAreaM2: 1.3,
    stripsPerRoll: 2,
    piecesPerStrip: 4,
    executableSets: 3,
    executablePieceCount: 6,
    consumedRawPieces: 6,
    rollAreaM2: 18,
    netAreaM2: 17,
    lossAreaM2: 1,
    utilizationPercent: 94.4,
    leftoverWidthMm: 30,
    leftoverLengthMm: 200,
    ...overrides,
  }
}

function buildMappedDemandLines(): BuildBatchEngineDemandLinesResult {
  return {
    validLines: [
      {
        demandLineId: 'demand-a',
        cutSizeUnitId: 'cut-unit-a',
        widthMm: 100,
        lengthMm: 200,
        pieceCountPerSet: 2,
        requiredSets: 3,
        requiredPieces: 6,
        layupCount: 1,
        cutAngle: 45,
        usageType: 'warp',
        priority: 9,
        allowMixedPlan: false,
        mustFulfill: true,
        rollGroupKey: 'group-a',
        orderSequence: 10,
        yarnDirectionMode: 'warp',
        processTags: ['tag-a'],
        noteKeywords: ['note-a'],
        sequenceNo: 1,
        areaM2: 1.2,
        occupiedWidthMm: 102,
        occupiedLengthMm: 205,
        occupiedAreaM2: 1.3,
        occupiedPieceAreaM2: 0.21,
        lineLabel: '#1 / code / 100x200',
        cutSizeGeometry: {
          cutSizeUnitId: 'cut-unit-a',
          widthMm: 100,
          lengthMm: 200,
          pieceCountPerSet: 2,
          layupCount: 1,
          cutAngleDeg: 45,
          baseAreaM2: 0.2,
          envelopeWidthMm: 102,
          envelopeLengthMm: 205,
          envelopeAreaM2: 0.21,
        },
        cutSizeDisplay: {
          code: 'code',
          name: 'name',
          sizeExpression: '100x200',
        },
        sourceLine: {
          id: 'line-a',
          sequenceNo: 1,
        } as never,
      },
    ],
    invalidLines: [],
  }
}

describe('buildBatchEngineSolveRequest', () => {
  it('returns null when required prerequisites are missing', () => {
    const request = buildBatchEngineSolveRequest({
      controls: resolveBatchEngineControls(buildControls()).normalizedControls,
      selectedCuttingPlan: undefined,
      selectedPrepregSpec: { id: 'prepreg-1', status: 'Active' } as PrepregMaterialSpec,
      mappedDemandLines: buildMappedDemandLines(),
      simulation: buildSimulation(),
    })

    expect(request).toBeNull()
  })

  it('returns null when there are no valid demand lines or invalid roll dimensions', () => {
    const request = buildBatchEngineSolveRequest({
      controls: resolveBatchEngineControls(buildControls({ rollWidthMm: '0' })).normalizedControls,
      selectedCuttingPlan: { id: 'cutting-plan-1' } as CuttingPlan,
      selectedPrepregSpec: { id: 'prepreg-1', status: 'Active' } as PrepregMaterialSpec,
      mappedDemandLines: { validLines: [], invalidLines: [] },
      simulation: buildSimulation(),
    })

    expect(request).toBeNull()
  })

  it('builds a typed solve request from controls and mapped demand lines', () => {
    const request = buildBatchEngineSolveRequest({
      controls: resolveBatchEngineControls(buildControls()).normalizedControls,
      selectedCuttingPlan: { id: 'cutting-plan-1' } as CuttingPlan,
      selectedPrepregSpec: { id: 'prepreg-1', status: 'Active' } as PrepregMaterialSpec,
      mappedDemandLines: buildMappedDemandLines(),
      simulation: buildSimulation(),
    })

    expect(request).not.toBeNull()
    expect(request?.rolls).toEqual([
      {
        rollId: 'prepreg-1',
        prepregSpecId: 'prepreg-1',
        rollWidthMm: 1200,
        rollLengthM: 15,
        remainingAreaM2: 18,
        edgeTrimMm: 5,
        status: 'Active',
      },
    ])
    expect(request?.demandLines).toEqual([
      {
        demandLineId: 'demand-a',
        cutSizeUnitId: 'cut-unit-a',
        widthMm: 100,
        lengthMm: 200,
        pieceCountPerSet: 2,
        requiredSets: 3,
        requiredPieces: 6,
        layupCount: 1,
        cutAngle: 45,
        usageType: 'warp',
        priority: 9,
        allowMixedPlan: false,
        mustFulfill: true,
        rollGroupKey: 'group-a',
        orderSequence: 10,
        yarnDirectionMode: 'warp',
        processTags: ['tag-a'],
        noteKeywords: ['note-a'],
      },
    ])
    expect(request?.scoreWeights).toEqual({
      fulfilledWeight: 35,
      utilizationWeight: 55,
      stabilityWeight: 10,
      assignmentPenaltyWeight: 4,
      unfulfilledPenaltyWeight: 12,
      splitPenaltyWeight: 6,
      mustPenaltyWeight: 45,
    })
    expect(request?.objectivePreset).toBe('yield-first')
    expect(request?.knifeGapMm).toBe(2.5)
    expect(request?.defaultEdgeTrimMm).toBe(5)
    expect(request?.maxCandidatePlans).toBe(3)
    expect(request?.timeLimitMs).toBe(2000)
  })
})

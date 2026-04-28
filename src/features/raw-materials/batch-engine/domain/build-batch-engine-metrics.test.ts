import { describe, expect, it } from 'vitest'
import { buildBatchEngineMetrics } from './build-batch-engine-metrics'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'

function buildControls(): BatchEngineControls {
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
  }
}

function buildSimulation(): BatchEngineSimulation {
  return {
    ready: true,
    selectedPlanName: 'Plan 1',
    demandLineCount: 1,
    validDemandLineCount: 1,
    invalidDemandLineCount: 0,
    totalRequiredSets: 1,
    totalRequiredPieces: 1,
    totalDemandAreaM2: 0.089,
    totalOccupiedAreaM2: 0.574,
    stripsPerRoll: 1,
    piecesPerStrip: 2,
    executableSets: 1,
    executablePieceCount: 2,
    consumedRawPieces: 1,
    rollAreaM2: 2,
    netAreaM2: 0.574,
    lossAreaM2: 1.426,
    utilizationPercent: 28.7,
    leftoverWidthMm: 100,
    leftoverLengthMm: 200,
  }
}

describe('buildBatchEngineMetrics', () => {
  it('uses occupied-area semantics in the utilization hint', () => {
    const metrics = buildBatchEngineMetrics({
      t: (key, params) => {
        if (key === 'rawMaterials.batchEngine.metrics.loss.utilizationHint') {
          return `utilization ${params?.percent}% / occupied ${params?.occupiedArea} m2`
        }
        return key
      },
      controls: buildControls(),
      simulation: buildSimulation(),
    })

    const lossMetric = metrics.find((item) => item.key === 'loss')
    expect(lossMetric?.hint).toContain('occupied 0.574 m2')
    expect(lossMetric?.hint).toContain('utilization 28.70%')
  })
})

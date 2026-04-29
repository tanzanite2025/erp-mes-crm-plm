import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls, BatchEngineSimulation, BatchOptimizerSolveRequest } from '../types'

export type BuildBatchEngineSolveRequestOptions = {
  controls: BatchEngineNormalizedControls
  selectedCuttingPlan?: CuttingPlan
  selectedPrepregSpec?: PrepregMaterialSpec
  mappedDemandLines: BuildBatchEngineDemandLinesResult
  simulation: BatchEngineSimulation
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function buildBatchEngineSolveRequest(
  options: BuildBatchEngineSolveRequestOptions
): BatchOptimizerSolveRequest | null {
  const { controls, selectedCuttingPlan, selectedPrepregSpec, mappedDemandLines, simulation } = options
  if (!selectedPrepregSpec || !selectedCuttingPlan || !simulation.ready) {
    return null
  }

  const rollWidthMm = controls.rollWidthMm
  const rollLengthM = controls.rollLengthM
  const knifeGapMm = controls.knifeGapMm
  const defaultEdgeTrimMm = controls.edgeTrimMm
  const validDemandLines = mappedDemandLines.validLines
  const rollAreaM2 = round((rollWidthMm * rollLengthM * 1000) / 1_000_000, 3)

  if (!rollWidthMm || !rollLengthM || validDemandLines.length <= 0) {
    return null
  }

  return {
    rolls: [
      {
        rollId: selectedPrepregSpec.id,
        prepregSpecId: selectedPrepregSpec.id,
        rollWidthMm,
        rollLengthM,
        remainingAreaM2: rollAreaM2,
        edgeTrimMm: defaultEdgeTrimMm,
        status: selectedPrepregSpec.status,
      },
    ],
    demandLines: validDemandLines.map((item) => ({
      demandLineId: item.demandLineId,
      cutSizeUnitId: item.cutSizeUnitId,
      widthMm: item.widthMm,
      lengthMm: item.lengthMm,
      pieceCountPerSet: item.pieceCountPerSet,
      requiredSets: item.requiredSets,
      requiredPieces: item.requiredPieces,
      layupCount: item.layupCount,
      cutAngle: item.cutAngle,
      usageType: item.usageType,
      priority: item.priority,
      allowMixedPlan: item.allowMixedPlan,
      mustFulfill: item.mustFulfill,
      rollGroupKey: item.rollGroupKey,
      orderSequence: item.orderSequence,
      yarnDirectionMode: item.yarnDirectionMode,
      processTags: item.processTags,
      noteKeywords: item.noteKeywords,
    })),
    knifeGapMm,
    defaultEdgeTrimMm,
    objectivePreset: controls.objectivePreset,
    scoreWeights: {
      fulfilledWeight: controls.fulfilledWeight,
      utilizationWeight: controls.utilizationWeight,
      stabilityWeight: controls.stabilityWeight,
      assignmentPenaltyWeight: controls.assignmentPenaltyWeight,
      unfulfilledPenaltyWeight: controls.unfulfilledPenaltyWeight,
      splitPenaltyWeight: controls.splitPenaltyWeight,
      mustPenaltyWeight: controls.mustPenaltyWeight,
    },
    maxCandidatePlans: 3,
    timeLimitMs: 2000,
  }
}

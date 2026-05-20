import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls, BatchEngineSimulation } from '../types'
import type { CuttingEngineInput, CuttingObjectivePreset } from '../types/cutting-engine-wasm'

export type BuildBatchEngineCuttingInputOptions = {
  controls: BatchEngineNormalizedControls
  selectedCuttingPlan?: CuttingPlan
  selectedPrepregSpec?: PrepregMaterialSpec
  mappedDemandLines: BuildBatchEngineDemandLinesResult
  simulation: BatchEngineSimulation
}

function resolveLengthBoundary(values: number[], mode: 'min' | 'max') {
  const usableValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (!usableValues.length) {
    return 1
  }
  return mode === 'min' ? Math.min(...usableValues) : Math.max(...usableValues)
}

function resolveCuttingObjectivePreset(value: BatchEngineNormalizedControls['objectivePreset']): CuttingObjectivePreset {
  return value === 'stability-first' ? 'stability-first' : 'yield-first'
}

export function buildBatchEngineCuttingInput(
  options: BuildBatchEngineCuttingInputOptions
): CuttingEngineInput | null {
  const { controls, selectedCuttingPlan, selectedPrepregSpec, mappedDemandLines, simulation } = options
  const validDemandLines = mappedDemandLines.validLines

  if (!selectedPrepregSpec || !selectedCuttingPlan || !simulation.ready) {
    return null
  }
  if (!controls.rollWidthMm || !controls.rollLengthM || validDemandLines.length <= 0) {
    return null
  }

  const unitLengths = validDemandLines.map((item) => item.lengthMm)

  return {
    rollWidthMm: controls.rollWidthMm,
    rollLengthMm: controls.rollLengthM * 1000,
    knifeGapMm: controls.knifeGapMm,
    edgeTrimMm: controls.edgeTrimMm,
    minSupportedLengthMm: resolveLengthBoundary(unitLengths, 'min'),
    maxSupportedLengthMm: resolveLengthBoundary(unitLengths, 'max'),
    objectivePreset: resolveCuttingObjectivePreset(controls.objectivePreset),
    weights: {
      utilizationWeight: controls.utilizationWeight,
      stabilityWeight: controls.stabilityWeight,
      splitPenalty: controls.splitPenaltyWeight,
    },
    cutUnits: validDemandLines.map((item) => ({
      id: item.demandLineId,
      label: item.lineLabel,
      widthMm: item.widthMm,
      lengthMm: item.lengthMm,
      quantity: item.requiredPieces,
      cutAngleDeg: item.cutAngle,
    })),
    maxCandidatePlans: 3,
  }
}

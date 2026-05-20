import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls, BatchEngineSimulation } from '../types'
import type { CuttingEngineInput, CuttingObjectivePreset } from '../types/cutting-engine-wasm'
import { buildCuttingEngineCutUnits } from './build-cutting-engine-cut-units'

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

function resolveConfiguredLengthBoundary(
  controls: BatchEngineNormalizedControls,
  unitLengths: number[],
  mode: 'min' | 'max'
) {
  const configuredValue = mode === 'min' ? controls.minSupportedLengthMm : controls.maxSupportedLengthMm
  return configuredValue > 0 ? configuredValue : resolveLengthBoundary(unitLengths, mode)
}

function resolveFixedDecisionLength(
  controls: BatchEngineNormalizedControls,
  minSupportedLengthMm: number,
  maxSupportedLengthMm: number
) {
  const fixedDecisionLengthMm = controls.fixedDecisionLengthMm
  if (!fixedDecisionLengthMm || fixedDecisionLengthMm < minSupportedLengthMm || fixedDecisionLengthMm > maxSupportedLengthMm) {
    return undefined
  }
  return fixedDecisionLengthMm
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
  const minSupportedLengthMm = resolveConfiguredLengthBoundary(controls, unitLengths, 'min')
  const maxSupportedLengthMm = Math.max(resolveConfiguredLengthBoundary(controls, unitLengths, 'max'), minSupportedLengthMm)
  const fixedDecisionLengthMm = resolveFixedDecisionLength(controls, minSupportedLengthMm, maxSupportedLengthMm)

  return {
    rollWidthMm: controls.rollWidthMm,
    rollLengthMm: controls.rollLengthM * 1000,
    knifeGapMm: controls.knifeGapMm,
    edgeTrimMm: controls.edgeTrimMm,
    minSupportedLengthMm,
    maxSupportedLengthMm,
    ...(fixedDecisionLengthMm ? { fixedDecisionLengthMm } : {}),
    objectivePreset: resolveCuttingObjectivePreset(controls.objectivePreset),
    weights: {
      utilizationWeight: controls.utilizationWeight,
      stabilityWeight: controls.stabilityWeight,
      splitPenalty: controls.splitPenaltyWeight,
    },
    directionRules: {
      angleMixMode: controls.angleMixMode,
      sameDirectionPreferred: controls.sameDirectionPreferred,
      directionSwitchPenaltyWeight: controls.directionSwitchPenaltyWeight,
    },
    ruleStrategy: controls.ruleStrategy,
    cutUnits: buildCuttingEngineCutUnits(validDemandLines),
    maxCandidatePlans: 3,
  }
}

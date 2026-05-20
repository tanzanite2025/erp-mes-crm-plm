import { toPositiveNumber } from '../../cut-size-library/domain/cut-size-geometry'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type {
  BatchEngineControls,
  BatchEngineNormalizedControls,
  BatchEngineResolvedControlState,
  BatchEngineResolvedControls,
} from '../types'

function normalizeText(value: string | undefined) {
  return value?.trim() || ''
}

export function resolveBatchEngineControls(
  rawControls: BatchEngineControls,
  selectedPrepregSpec?: PrepregMaterialSpec
): BatchEngineResolvedControlState {
  const resolvedControls: BatchEngineResolvedControls = {
    ...rawControls,
    rollWidthMm: normalizeText(selectedPrepregSpec?.widthMm) || normalizeText(rawControls.rollWidthMm),
    rollLengthM: normalizeText(selectedPrepregSpec?.lengthM) || normalizeText(rawControls.rollLengthM),
  }

  const normalizedControls: BatchEngineNormalizedControls = {
    selectedPrepregSpecId: rawControls.selectedPrepregSpecId,
    selectedCuttingPlanId: rawControls.selectedCuttingPlanId,
    rollWidthMm: toPositiveNumber(resolvedControls.rollWidthMm),
    rollLengthM: toPositiveNumber(resolvedControls.rollLengthM),
    knifeGapMm: toPositiveNumber(rawControls.knifeGapMm),
    edgeTrimMm: toPositiveNumber(rawControls.edgeTrimMm),
    objectivePreset: rawControls.objectivePreset,
    utilizationWeight: toPositiveNumber(rawControls.utilizationWeight),
    stabilityWeight: toPositiveNumber(rawControls.stabilityWeight),
    splitPenaltyWeight: toPositiveNumber(rawControls.splitPenaltyWeight),
  }

  return {
    rawControls,
    resolvedControls,
    normalizedControls,
  }
}

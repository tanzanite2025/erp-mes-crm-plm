import type { CutSizeGeometryProjection } from '../../cut-size-library/domain/cut-size-geometry'
import type { CuttingEngineAngleMixMode, CuttingEngineRuleStrategy } from '../../engine-config/types'
import type { BatchOptimizerObjectivePreset } from './batch-engine-api'

export type BatchEngineControls = {
  selectedPrepregSpecId: string
  selectedCuttingPlanId: string
  rollWidthMm: string
  rollLengthM: string
  knifeGapMm: string
  edgeTrimMm: string
  objectivePreset: BatchOptimizerObjectivePreset
  utilizationWeight: string
  stabilityWeight: string
  splitPenaltyWeight: string
  mustFulfillPenaltyWeight: string
  directionSwitchPenaltyWeight: string
  sameDirectionPreferred: boolean
  angleMixMode: CuttingEngineAngleMixMode
  ruleStrategy: CuttingEngineRuleStrategy
  minSupportedLengthMm: string
  maxSupportedLengthMm: string
  fixedDecisionLengthMm: string
}

export type BatchEngineResolvedControls = BatchEngineControls

export type BatchEngineNormalizedControls = {
  selectedPrepregSpecId: string
  selectedCuttingPlanId: string
  rollWidthMm: number
  rollLengthM: number
  knifeGapMm: number
  edgeTrimMm: number
  objectivePreset: BatchOptimizerObjectivePreset
  utilizationWeight: number
  stabilityWeight: number
  splitPenaltyWeight: number
  mustFulfillPenaltyWeight: number
  directionSwitchPenaltyWeight: number
  sameDirectionPreferred: boolean
  angleMixMode: CuttingEngineAngleMixMode
  ruleStrategy: CuttingEngineRuleStrategy
  minSupportedLengthMm: number
  maxSupportedLengthMm: number
  fixedDecisionLengthMm: number
}

export type BatchEngineResolvedControlState = {
  rawControls: BatchEngineControls
  resolvedControls: BatchEngineResolvedControls
  normalizedControls: BatchEngineNormalizedControls
}

export type BatchEngineSimulation = {
  ready: boolean
  reason?: string
  selectedPlanName?: string
  selectedUnit?: CutSizeGeometryProjection
  demandLineCount: number
  validDemandLineCount: number
  invalidDemandLineCount: number
  totalRequiredSets: number
  totalRequiredPieces: number
  totalDemandAreaM2: number
  totalOccupiedAreaM2: number
  stripsPerRoll: number
  piecesPerStrip: number
  executableSets: number
  executablePieceCount: number
  consumedRawPieces: number
  rollAreaM2: number
  netAreaM2: number
  lossAreaM2: number
  utilizationPercent: number
  leftoverWidthMm: number
  leftoverLengthMm: number
}

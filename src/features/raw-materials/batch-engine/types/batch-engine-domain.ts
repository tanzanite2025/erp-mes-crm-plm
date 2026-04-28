import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchOptimizerObjectivePreset } from './batch-engine-api'

export type BatchEngineControls = {
  selectedPrepregSpecId: string
  selectedCuttingPlanId: string
  rollWidthMm: string
  rollLengthM: string
  knifeGapMm: string
  edgeTrimMm: string
  objectivePreset: BatchOptimizerObjectivePreset
  fulfilledWeight: string
  utilizationWeight: string
  stabilityWeight: string
  assignmentPenaltyWeight: string
  unfulfilledPenaltyWeight: string
  splitPenaltyWeight: string
  mustPenaltyWeight: string
}

export type BatchEngineSimulation = {
  ready: boolean
  reason?: string
  selectedPlanName?: string
  selectedUnit?: CutSizeUnit
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

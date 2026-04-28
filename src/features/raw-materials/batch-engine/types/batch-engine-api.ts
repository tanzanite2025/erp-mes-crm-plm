export type BatchOptimizerObjectivePreset = 'yield-first' | 'delivery-first' | 'stability-first'

export type BatchOptimizerScoreWeights = {
  fulfilledWeight: number
  utilizationWeight: number
  stabilityWeight: number
  assignmentPenaltyWeight: number
  unfulfilledPenaltyWeight: number
  splitPenaltyWeight: number
  mustPenaltyWeight: number
}

export type BatchOptimizerRollInput = {
  rollId: string
  prepregSpecId: string
  rollWidthMm: number
  rollLengthM: number
  remainingAreaM2: number
  edgeTrimMm: number
  status: string
}

export type BatchOptimizerDemandLineInput = {
  demandLineId: string
  cutSizeUnitId: string
  widthMm: number
  lengthMm: number
  pieceCountPerSet: number
  requiredSets: number
  requiredPieces: number
  layupCount: number
  cutAngle: number
  usageType: string
  priority: number
  allowMixedPlan: boolean
  mustFulfill: boolean
  rollGroupKey: string
  orderSequence: number
  yarnDirectionMode: string
  processTags: string[]
  noteKeywords: string[]
}

export type BatchOptimizerSolveRequest = {
  rolls: BatchOptimizerRollInput[]
  demandLines: BatchOptimizerDemandLineInput[]
  knifeGapMm: number
  defaultEdgeTrimMm: number
  objectivePreset: BatchOptimizerObjectivePreset
  scoreWeights: BatchOptimizerScoreWeights
  maxCandidatePlans: number
  timeLimitMs: number
}

export type BatchOptimizerPlanAssignment = {
  rollId: string
  demandLineId: string
  allocatedSets: number
  allocatedPieces: number
}

export type BatchOptimizerUnfulfilledLine = {
  demandLineId: string
  remainingSets: number
  remainingPieces: number
  reason: string
}

export type BatchOptimizerPlanLayoutRollSummary = {
  rollId: string
  allocatedSets: number
  allocatedPieces: number
  utilizedAreaM2: number
  utilizationPercent: number
  unusedAreaM2: number
  isUsed: boolean
}

export type BatchOptimizerPlanLayoutDemandSummary = {
  demandLineId: string
  allocatedSets: number
  allocatedPieces: number
  rollCount: number
  remainingSets: number
  remainingPieces: number
  requiredSets: number
  requiredPieces: number
  fulfilled: boolean
  mustFulfill: boolean
  isSplitAcrossRolls: boolean
  coveragePercent: number
  usageType: string
  priority: number
  rollIds: string[]
  zoneIds: string[]
}

export type BatchOptimizerPlanLayoutZone = {
  id: string
  kind: string
  usageCategory: string
  label: string
  detail: string
  rollId?: string
  demandLineId?: string
  areaM2: number
  allocatedSets: number
  allocatedPieces: number
  coverageSharePercent: number
  tooltipLines: string[]
  x: number
  y: number
  width: number
  height: number
}

export type BatchOptimizerPlanLayoutSummary = {
  canvasWidthMm: number
  canvasHeightMm: number
  rollCount: number
  assignmentCount: number
  fulfilledDemandLineCount: number
  unfulfilledDemandLineCount: number
  rolls: BatchOptimizerPlanLayoutRollSummary[]
  demandLines: BatchOptimizerPlanLayoutDemandSummary[]
  zones: BatchOptimizerPlanLayoutZone[]
}

export type BatchOptimizerPlanLossBreakdown = {
  unusedRollAreaM2: number
  unfulfilledAreaM2: number
  trimLossAreaM2: number
  message: string
}

export type BatchOptimizerPlanComparisonSummary = {
  fulfilledDemandCount: number
  mustFulfillSatisfied: boolean
  splitDemandCount: number
  usedRollCount: number
  usedRollPercent: number
  unusedRollAreaM2: number
  unfulfilledAreaM2: number
  trimLossAreaM2: number
}

export type BatchOptimizerPlanScoreBreakdown = {
  objectivePreset: string
  appliedWeights: BatchOptimizerScoreWeights
  fulfilledRatePercent: number
  fulfilledContribution: number
  utilizationContribution: number
  stabilityContribution: number
  assignmentPenalty: number
  unfulfilledPenalty: number
  splitPenalty: number
  mustFulfillPenalty: number
  groupSplitCount: number
  sequenceViolationCount: number
  directionSwitchCount: number
  mixViolationCount: number
  finalScore: number
}

export type BatchOptimizerMustFulfillDiagnostic = {
  demandLineId: string
  status: string
  reasonCode: string
  message: string
  blockingConstraintCode: string
  blockingConstraint: string
  suggestion: string
}

export type BatchOptimizerPlanDiffSummary = {
  baselinePlanRank: number
  baselineStrategyKey: string
  mode: string
  addedZoneIds: string[]
  removedZoneIds: string[]
  changedDemandLineIds: string[]
  changedRollIds: string[]
  highlightZoneIds: string[]
}

export type BatchOptimizerPlanReportSummary = {
  planRank: number
  strategyKey: string
  objectivePreset: string
  appliedWeights: BatchOptimizerScoreWeights
  baselinePlanRank: number
  baselineStrategyKey: string
  score: number
  utilizationPercent: number
  lossAreaM2: number
  mustFulfillRiskCount: number
  changedDemandLineCount: number
  changedRollCount: number
  highlightZoneCount: number
  comparisonSummary: BatchOptimizerPlanComparisonSummary
  scoreBreakdown: BatchOptimizerPlanScoreBreakdown
}

export type BatchOptimizerPlan = {
  rank: number
  strategyKey: string
  score: number
  utilizationPercent: number
  lossAreaM2: number
  explanation: string
  assignments: BatchOptimizerPlanAssignment[]
  unfulfilledLines: BatchOptimizerUnfulfilledLine[]
  layoutSummary: BatchOptimizerPlanLayoutSummary
  lossBreakdown: BatchOptimizerPlanLossBreakdown
  comparisonSummary: BatchOptimizerPlanComparisonSummary
  scoreBreakdown: BatchOptimizerPlanScoreBreakdown
  mustFulfillDiagnostics: BatchOptimizerMustFulfillDiagnostic[]
  diffSummary: BatchOptimizerPlanDiffSummary
  diffSummaries: BatchOptimizerPlanDiffSummary[]
  reportSummary: BatchOptimizerPlanReportSummary
}

export type BatchOptimizerSolveResponse = {
  requestId: string
  summary: {
    solverStatus: string
    message: string
    planCount: number
  }
  plans: BatchOptimizerPlan[]
}

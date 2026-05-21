export type BatchOptimizerScoreWeights = {
  fulfilledWeight: number
  assignmentPenaltyWeight: number
  unfulfilledPenaltyWeight: number
  splitPenaltyWeight: number
  mustPenaltyWeight: number
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

export type BatchOptimizerGeometryPoint = {
  x: number
  y: number
}

export type BatchOptimizerGeometryLayoutZone = {
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
  polygonPoints: BatchOptimizerGeometryPoint[]
}

export type BatchOptimizerGeometryLayoutSummary = {
  canvasWidthMm: number
  canvasHeightMm: number
  zones: BatchOptimizerGeometryLayoutZone[]
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
  appliedWeights: BatchOptimizerScoreWeights
  fulfilledRatePercent: number
  fulfilledContribution: number
  utilizationContribution: number
  assignmentPenalty: number
  unfulfilledPenalty: number
  splitPenalty: number
  mustFulfillPenalty: number
  groupSplitCount: number
  sequenceViolationCount: number
  adjacencyBreakCount: number
  directionSwitchCount: number
  mixViolationCount: number
  rollSwitchCount: number
  geometryReuseHitCount: number
  reusableResidualAreaM2: number
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

export type BatchOptimizerSearchConfigSummary = {
  presetKey: string
  beamWidth: number
  maxSearchDepth: number
  perDemandBranchingLimit: number
  residualReuseBias: number
  convergenceAreaBucketM2: number
}

export type BatchOptimizerContinuitySegment = {
  kind: string
  key: string
  rollId?: string
  demandLineIds: string[]
  preserved: boolean
  reason: string
  breakPosition?: number
  breakBeforeDemandLineId?: string
  breakAfterDemandLineId?: string
  attributedZoneIds: string[]
}

export type BatchOptimizerHeatZoneAttribution = {
  zoneId: string
  segmentKind: string
  segmentKey: string
  reason: string
  rollId?: string
  demandLineIds: string[]
  clusterId?: string
  breakSliceIds: string[]
}

export type BatchOptimizerBreakSliceSummary = {
  id: string
  segmentKind: string
  segmentKey: string
  rollId?: string
  breakPosition: number
  breakBeforeDemandLineId?: string
  breakAfterDemandLineId?: string
  zoneIds: string[]
  clusterId?: string
  reason: string
  severityScore: number
}

export type BatchOptimizerZoneClusterSummary = {
  clusterId: string
  zoneIds: string[]
  rollIds: string[]
  demandLineIds: string[]
  breakSliceIds: string[]
  dominantReason: string
  dominantDemandLineId?: string
  densityScore: number
}

export type BatchOptimizerDynamicStrategyBudgetStat = {
  strategyKey: string
  inputCount: number
  targetQuota: number
  keptCount: number
  priorityScore: number
  rerankReason: string
}

export type BatchOptimizerStrategyBudgetStat = {
  strategyKey: string
  inputCount: number
  keptCount: number
}

export type BatchOptimizerCandidateBudgetSummary = {
  perStrategyQuota: number
  globalBudget: number
  mergedCandidateCount: number
  strategyStats: BatchOptimizerStrategyBudgetStat[]
  dynamicStrategyStats: BatchOptimizerDynamicStrategyBudgetStat[]
}

export type BatchOptimizerPlanExplainabilitySummary = {
  groupSegments: BatchOptimizerContinuitySegment[]
  sequenceSegments: BatchOptimizerContinuitySegment[]
  adjacencySegments: BatchOptimizerContinuitySegment[]
  primaryBreakReasons: string[]
  heatZoneAttributions: BatchOptimizerHeatZoneAttribution[]
  breakSlices: BatchOptimizerBreakSliceSummary[]
  zoneClusters: BatchOptimizerZoneClusterSummary[]
}

export type BatchOptimizerPlanReportSummary = {
  planRank: number
  strategyKey: string
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
  adjacencyBreakCount: number
  rollSwitchCount: number
  geometryReuseHitCount: number
  reusableResidualAreaM2: number
  searchConfig: BatchOptimizerSearchConfigSummary
  candidateBudgetSummary: BatchOptimizerCandidateBudgetSummary
  budgetRerankReason: string
  explainabilitySummary: BatchOptimizerPlanExplainabilitySummary
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
  geometryLayoutSummary?: BatchOptimizerGeometryLayoutSummary
  lossBreakdown: BatchOptimizerPlanLossBreakdown
  comparisonSummary: BatchOptimizerPlanComparisonSummary
  scoreBreakdown: BatchOptimizerPlanScoreBreakdown
  mustFulfillDiagnostics: BatchOptimizerMustFulfillDiagnostic[]
  diffSummary: BatchOptimizerPlanDiffSummary
  diffSummaries: BatchOptimizerPlanDiffSummary[]
  searchConfig: BatchOptimizerSearchConfigSummary
  candidateBudgetSummary: BatchOptimizerCandidateBudgetSummary
  budgetRerankReason: string
  explainabilitySummary: BatchOptimizerPlanExplainabilitySummary
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

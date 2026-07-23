export type CuttingAngleMixMode =
  | 'allow'
  | 'prefer-same-angle'
  | 'strict-same-angle'
export type CuttingMustFulfillMode = 'strict' | 'soft-penalty' | 'ignore'
export type CuttingMixingStrategy = 'allow' | 'sameGroupOnly' | 'strictNoMix'
export type CuttingOrderStrategy = 'respectOrder' | 'softPenalty' | 'ignore'
export type CuttingDirectionStrategy =
  | 'sameDirectionPreferred'
  | 'sameDirectionRequired'
  | 'allowSwitch'

export type CuttingEngineWeights = {
  splitPenalty: number
  mustFulfillPenaltyWeight: number
}

export type CuttingEngineDirectionRules = {
  angleMixMode: CuttingAngleMixMode
  sameDirectionPreferred: boolean
  directionSwitchPenaltyWeight: number
}

export type CuttingEngineRuleStrategy = {
  mustFulfillMode: CuttingMustFulfillMode
  mixingStrategy: CuttingMixingStrategy
  orderStrategy: CuttingOrderStrategy
  directionStrategy: CuttingDirectionStrategy
}

export type CuttingUnitInput = {
  id: string
  label: string
  widthMm: number
  lengthMm: number
  quantity: number
  cutAngleDeg: number
  priority: number
  mustFulfill: boolean
  allowMixedPlan: boolean
  rollGroupKey: string
  orderSequence: number
  yarnDirectionMode: string
  processTags: string[]
}

export type CuttingEngineInput = {
  rollWidthMm: number
  rollLengthMm: number
  knifeGapMm: number
  edgeTrimMm: number
  minSupportedLengthMm: number
  maxSupportedLengthMm: number
  fixedDecisionLengthMm?: number
  weights: CuttingEngineWeights
  directionRules: CuttingEngineDirectionRules
  ruleStrategy: CuttingEngineRuleStrategy
  cutUnits: CuttingUnitInput[]
  maxCandidatePlans: number
  maxSolveDurationSeconds?: number
}

export type CuttingLayoutZone = {
  id: string
  kind: 'Roll' | 'Material' | 'Loss'
  rollId: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  label: string
  unitId?: string | null
  allocatedPieces: number
}

export type CuttingPlanRollSummary = {
  rollId: string
  producedPieces: number
  utilizationPercent: number
  lossAreaM2: number
}

export type CuttingPlan = {
  planId: string
  score: number
  decisionLengthMm: number
  utilizationPercent: number
  lossAreaM2: number
  producedPieces: number
  directionSwitchCount: number
  angleMixViolationCount: number
  mustFulfillSatisfied: boolean
  mustFulfillPenalty: number
  rolls: CuttingPlanRollSummary[]
  ruleDiagnostics: CuttingPlanRuleDiagnostics
  zones: CuttingLayoutZone[]
  warnings: string[]
}

export type CuttingPlanRuleDiagnostics = {
  priority: number
  mustFulfill: boolean
  allowMixedPlan: boolean
  rollGroupKey: string
  orderSequence: number
  processTags: string[]
  mustFulfillCount: number
  mixedPlanRestrictedCount: number
  rollGroupCount: number
  processTagCount: number
  prioritySum: number
  sequenceSpan: number
}

export type CuttingEngineOutput = {
  plans: CuttingPlan[]
  warnings: string[]
}

export type CuttingEngineWasmEnvelope<T> = {
  ok: boolean
  data?: T | null
  error?: string | null
}

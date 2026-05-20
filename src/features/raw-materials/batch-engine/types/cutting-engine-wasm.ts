export type CuttingObjectivePreset = 'yield-first' | 'stability-first'

export type CuttingEngineWeights = {
  utilizationWeight: number
  stabilityWeight: number
  splitPenalty: number
}

export type CuttingUnitInput = {
  id: string
  label: string
  widthMm: number
  lengthMm: number
  quantity: number
  cutAngleDeg: number
}

export type CuttingEngineInput = {
  rollWidthMm: number
  rollLengthMm: number
  knifeGapMm: number
  edgeTrimMm: number
  minSupportedLengthMm: number
  maxSupportedLengthMm: number
  fixedDecisionLengthMm?: number
  objectivePreset: CuttingObjectivePreset
  weights: CuttingEngineWeights
  cutUnits: CuttingUnitInput[]
  maxCandidatePlans: number
}

export type CuttingLayoutZone = {
  id: string
  kind: 'Roll' | 'Material' | 'Loss'
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  label: string
}

export type CuttingPlan = {
  planId: string
  score: number
  decisionLengthMm: number
  utilizationPercent: number
  lossAreaM2: number
  producedPieces: number
  zones: CuttingLayoutZone[]
  warnings: string[]
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

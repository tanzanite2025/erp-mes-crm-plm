export type CuttingEngineWeights = {
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

export type CuttingEngineWasmModule = {
  solveCuttingEngine(inputJson: string): string
}

type WasmEnvelope<T> = {
  ok: boolean
  data?: T | null
  error?: string | null
}

export function solveCuttingEngineWithWasm(
  wasmModule: CuttingEngineWasmModule,
  input: CuttingEngineInput
): CuttingEngineOutput {
  const raw = wasmModule.solveCuttingEngine(JSON.stringify(input))
  const envelope = JSON.parse(raw) as WasmEnvelope<CuttingEngineOutput>

  if (!envelope.ok || !envelope.data) {
    throw new Error(envelope.error || 'Cutting engine WASM solve failed')
  }

  return envelope.data
}

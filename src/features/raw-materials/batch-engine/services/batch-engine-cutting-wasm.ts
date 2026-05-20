import initCuttingEngineWasm, { solveCuttingEngine } from '../wasm/pkg/xdfc_cutting_engine_wasm.js'
import type { CuttingEngineInput, CuttingEngineOutput, CuttingEngineWasmEnvelope } from '../types/cutting-engine-wasm'

let initPromise: Promise<unknown> | null = null

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }
  return 'unknown error'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isCuttingLayoutZone(value: unknown) {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === 'string'
    && (value.kind === 'Roll' || value.kind === 'Material' || value.kind === 'Loss')
    && isFiniteNumber(value.xMm)
    && isFiniteNumber(value.yMm)
    && isFiniteNumber(value.widthMm)
    && isFiniteNumber(value.heightMm)
    && typeof value.label === 'string'
  )
}

function isCuttingPlan(value: unknown) {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.planId === 'string'
    && isFiniteNumber(value.score)
    && isFiniteNumber(value.decisionLengthMm)
    && isFiniteNumber(value.utilizationPercent)
    && isFiniteNumber(value.lossAreaM2)
    && isFiniteNumber(value.producedPieces)
    && Array.isArray(value.zones)
    && value.zones.every(isCuttingLayoutZone)
    && isStringArray(value.warnings)
  )
}

function isCuttingEngineOutput(value: unknown): value is CuttingEngineOutput {
  if (!isRecord(value)) {
    return false
  }
  return Array.isArray(value.plans) && value.plans.every(isCuttingPlan) && isStringArray(value.warnings)
}

async function ensureCuttingEngineWasm() {
  initPromise ??= initCuttingEngineWasm().catch((error: unknown) => {
    initPromise = null
    throw new Error(`Rust/WASM 裁纱引擎初始化失败：${toErrorMessage(error)}`)
  })
  await initPromise
}

function parseCuttingEngineEnvelope(raw: string): CuttingEngineWasmEnvelope<CuttingEngineOutput> {
  try {
    const envelope = JSON.parse(raw) as Partial<CuttingEngineWasmEnvelope<CuttingEngineOutput>>
    if (!envelope || typeof envelope.ok !== 'boolean') {
      throw new Error('invalid envelope')
    }
    return envelope as CuttingEngineWasmEnvelope<CuttingEngineOutput>
  } catch (error) {
    throw new Error(`Rust/WASM 裁纱引擎返回格式异常：${toErrorMessage(error)}`)
  }
}

export async function solveBatchEngineWithCuttingWasm(input: CuttingEngineInput): Promise<CuttingEngineOutput> {
  await ensureCuttingEngineWasm()
  let raw: string

  try {
    raw = solveCuttingEngine(JSON.stringify(input))
  } catch (error) {
    throw new Error(`Rust/WASM 裁纱引擎执行失败：${toErrorMessage(error)}`)
  }

  const envelope = parseCuttingEngineEnvelope(raw)

  if (!envelope.ok || !envelope.data) {
    throw new Error(envelope.error || 'Rust/WASM 裁纱引擎求解失败')
  }
  if (!isCuttingEngineOutput(envelope.data)) {
    throw new Error('Rust/WASM 裁纱引擎返回数据结构异常')
  }

  return envelope.data
}

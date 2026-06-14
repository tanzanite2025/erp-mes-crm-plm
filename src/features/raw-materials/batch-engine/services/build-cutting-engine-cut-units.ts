import type { BatchEngineResolvedDemandLine } from '../domain/batch-engine-demand-line-types'
import type { CuttingUnitInput } from '../types/cutting-engine-wasm'

function resolveNonNegativeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0
}

function resolveInteger(value: number) {
  return Number.isFinite(value) ? Math.trunc(value) : 0
}

function resolveString(value: string) {
  return value.trim()
}

function resolveStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

export function buildCuttingEngineCutUnits(
  lines: BatchEngineResolvedDemandLine[]
): CuttingUnitInput[] {
  return lines.map((item) => ({
    id: item.demandLineId,
    label: item.lineLabel,
    widthMm: item.widthMm,
    lengthMm: item.lengthMm,
    quantity: item.requiredPieces,
    cutAngleDeg: item.cutAngle,
    priority: resolveNonNegativeNumber(item.priority),
    mustFulfill: item.mustFulfill,
    allowMixedPlan: item.allowMixedPlan,
    rollGroupKey: resolveString(item.rollGroupKey),
    orderSequence: resolveInteger(item.orderSequence),
    yarnDirectionMode: resolveString(item.yarnDirectionMode),
    processTags: resolveStringList(item.processTags),
  }))
}

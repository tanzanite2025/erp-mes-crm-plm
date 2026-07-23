import type {
  BatchOptimizerDemandLineInput,
  BatchOptimizerPlanLayoutDemandSummary,
  BatchOptimizerUnfulfilledLine,
} from '../../types/batch-engine-api'
import type {
  CuttingEngineInput,
  CuttingPlan as CuttingEnginePlan,
} from '../../types/cutting-engine-wasm'
import { percent } from './math'

export function resolvePlanDemandLineId(
  plan: CuttingEnginePlan,
  input: CuttingEngineInput
) {
  const fromPlanId = plan.planId.startsWith('plan-')
    ? plan.planId.slice(5)
    : plan.planId
  if (input.cutUnits.some((unit) => unit.id === fromPlanId)) {
    return fromPlanId
  }
  const materialZone = plan.zones.find((zone) => zone.kind === 'Material')
  if (materialZone?.unitId) {
    return materialZone.unitId
  }
  const fromZoneId = materialZone?.id.startsWith('material-')
    ? materialZone.id.slice(9)
    : materialZone?.id
  return fromZoneId || fromPlanId
}

export function buildDemandSummary(
  demandLine: BatchOptimizerDemandLineInput,
  allocationsByRoll: Map<
    string,
    {
      allocatedPieces: number
      zoneIds: string[]
    }
  >
): BatchOptimizerPlanLayoutDemandSummary {
  let remainingAllocatablePieces = demandLine.requiredPieces
  let allocatedPieces = 0
  const rollIds: string[] = []
  const zoneIds: string[] = []
  for (const [rollId, allocation] of allocationsByRoll) {
    const rollAllocatedPieces = Math.min(
      Math.max(allocation.allocatedPieces, 0),
      remainingAllocatablePieces
    )
    if (rollAllocatedPieces <= 0) {
      continue
    }
    allocatedPieces += rollAllocatedPieces
    remainingAllocatablePieces -= rollAllocatedPieces
    rollIds.push(rollId)
    zoneIds.push(...allocation.zoneIds)
  }
  const remainingPieces = Math.max(
    demandLine.requiredPieces - allocatedPieces,
    0
  )
  const pieceCountPerSet = Math.max(demandLine.pieceCountPerSet, 1)
  return {
    demandLineId: demandLine.demandLineId,
    allocatedSets: Math.floor(allocatedPieces / pieceCountPerSet),
    allocatedPieces,
    rollCount: rollIds.length,
    remainingSets: Math.ceil(remainingPieces / pieceCountPerSet),
    remainingPieces,
    requiredSets: demandLine.requiredSets,
    requiredPieces: demandLine.requiredPieces,
    fulfilled: remainingPieces <= 0,
    mustFulfill: demandLine.mustFulfill,
    isSplitAcrossRolls: rollIds.length > 1,
    coveragePercent: percent(allocatedPieces, demandLine.requiredPieces),
    usageType: demandLine.usageType || 'geometry',
    priority: demandLine.priority,
    rollIds,
    zoneIds,
  }
}

export function buildUnfulfilledLines(
  demandSummaries: BatchOptimizerPlanLayoutDemandSummary[]
): BatchOptimizerUnfulfilledLine[] {
  return demandSummaries
    .filter((line) => line.remainingPieces > 0)
    .map((line) => ({
      demandLineId: line.demandLineId,
      remainingSets: line.remainingSets,
      remainingPieces: line.remainingPieces,
      reason: 'Rust/WASM 几何核心当前方案未覆盖该需求行',
    }))
}

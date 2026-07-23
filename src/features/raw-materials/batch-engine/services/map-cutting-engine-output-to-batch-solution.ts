import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls } from '../types'
import type {
  BatchOptimizerMustFulfillDiagnostic,
  BatchOptimizerPlan,
  BatchOptimizerSolveResponse,
} from '../types/batch-engine-api'
import type {
  CuttingEngineInput,
  CuttingEngineOutput,
} from '../types/cutting-engine-wasm'
import {
  buildRustWasmCuttingEngineSummaryMessage,
  RUST_WASM_CUTTING_ENGINE_SOLVER_STATUS,
  RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY,
} from './cutting-engine-output-mapper/constants'
import {
  buildDemandSummary,
  buildUnfulfilledLines,
  resolvePlanDemandLineId,
} from './cutting-engine-output-mapper/demands'
import {
  buildGeometryZone,
  buildLayoutZone,
} from './cutting-engine-output-mapper/layout'
import { percent, round } from './cutting-engine-output-mapper/math'
import {
  buildAppliedWeights,
  buildCandidateBudgetSummary,
  buildDiffSummary,
  buildExplainabilitySummary,
  buildReportSummary,
  buildScoreBreakdown,
  buildSearchConfig,
} from './cutting-engine-output-mapper/summaries'

type MapCuttingEngineOutputToBatchSolutionOptions = {
  input: CuttingEngineInput
  output: CuttingEngineOutput
  controls: BatchEngineNormalizedControls
  selectedPrepregSpec?: PrepregMaterialSpec
  mappedDemandLines: BuildBatchEngineDemandLinesResult
}

function buildMustFulfillDiagnostics(options: {
  activeDemand?: BuildBatchEngineDemandLinesResult['validLines'][number]
  producedPieces: number
  mustFulfillSatisfied: boolean
}): BatchOptimizerMustFulfillDiagnostic[] {
  const { activeDemand, producedPieces, mustFulfillSatisfied } = options
  if (!activeDemand?.mustFulfill) {
    return []
  }

  const status = mustFulfillSatisfied ? 'fulfilled' : 'unfulfilled'
  return [
    {
      demandLineId: activeDemand.demandLineId,
      status,
      reasonCode: mustFulfillSatisfied
        ? 'must_fulfill_satisfied'
        : 'must_fulfill_unmet',
      message: mustFulfillSatisfied
        ? `MustFulfill 需求已生产 ${producedPieces}/${activeDemand.requiredPieces} 件。`
        : `MustFulfill 需求仅生产 ${producedPieces}/${activeDemand.requiredPieces} 件。`,
      blockingConstraintCode: mustFulfillSatisfied ? 'none' : 'capacity',
      blockingConstraint: mustFulfillSatisfied
        ? '无阻断约束'
        : '产能或几何约束限制',
      suggestion: mustFulfillSatisfied
        ? '无需处理。'
        : '可切换 strict 模式拒绝该方案，或提升卷材容量 / 放宽几何约束。',
    },
  ]
}

function resolveZoneDemandLineId(
  zone: CuttingEngineOutput['plans'][number]['zones'][number],
  fallbackDemandLineId: string
) {
  return zone.unitId || fallbackDemandLineId
}

function resolveMappedRollId(
  coreRollId: string,
  planRollCount: number,
  selectedPrepregSpecId?: string
) {
  if (planRollCount === 1 && selectedPrepregSpecId) {
    return selectedPrepregSpecId
  }
  if (selectedPrepregSpecId) {
    return `${selectedPrepregSpecId}:${coreRollId}`
  }
  return coreRollId
}

function buildPlanRollIdIndex(options: {
  plan: CuttingEngineOutput['plans'][number]
  selectedPrepregSpec?: PrepregMaterialSpec
}) {
  const { plan, selectedPrepregSpec } = options
  return new Map(
    plan.rolls.map((roll) => [
      roll.rollId,
      resolveMappedRollId(
        roll.rollId,
        plan.rolls.length,
        selectedPrepregSpec?.id
      ),
    ])
  )
}

function resolveZoneAllocatedPieces(
  zone: CuttingEngineOutput['plans'][number]['zones'][number]
) {
  return zone.kind === 'Material' ? Math.max(zone.allocatedPieces, 0) : 0
}

function buildPlanDemandAllocationIndex(options: {
  plan: CuttingEngineOutput['plans'][number]
  fallbackDemandLineId: string
  rollIdByCoreRollId: Map<string, string>
}) {
  const { plan, fallbackDemandLineId, rollIdByCoreRollId } = options
  const allocatedPiecesByDemandLine = new Map<string, Map<string, number>>()
  const zoneIdsByDemandLine = new Map<string, Map<string, string[]>>()

  for (const zone of plan.zones) {
    if (zone.kind !== 'Material') {
      continue
    }
    const demandLineId = resolveZoneDemandLineId(zone, fallbackDemandLineId)
    const rollId = rollIdByCoreRollId.get(zone.rollId) || zone.rollId
    const allocatedPieces = resolveZoneAllocatedPieces(zone)
    const allocatedPiecesByRoll =
      allocatedPiecesByDemandLine.get(demandLineId) || new Map<string, number>()
    allocatedPiecesByRoll.set(
      rollId,
      (allocatedPiecesByRoll.get(rollId) || 0) + allocatedPieces
    )
    allocatedPiecesByDemandLine.set(demandLineId, allocatedPiecesByRoll)
    const zoneIdsByRoll =
      zoneIdsByDemandLine.get(demandLineId) || new Map<string, string[]>()
    const zoneIds = zoneIdsByRoll.get(rollId) || []
    zoneIds.push(zone.id)
    zoneIdsByRoll.set(rollId, zoneIds)
    zoneIdsByDemandLine.set(demandLineId, zoneIdsByRoll)
  }

  return {
    allocatedPiecesByDemandLine,
    zoneIdsByDemandLine,
  }
}

function buildPlanAssignments(options: {
  validLines: BuildBatchEngineDemandLinesResult['validLines']
  allocatedPiecesByDemandLine: Map<string, Map<string, number>>
}) {
  const { validLines, allocatedPiecesByDemandLine } = options
  return validLines.flatMap((line) => {
    let remainingPieces = line.requiredPieces
    const allocationsByRoll =
      allocatedPiecesByDemandLine.get(line.demandLineId) ||
      new Map<string, number>()
    return Array.from(allocationsByRoll).flatMap(
      ([rollId, allocatedPieces]) => {
        const piecesForAssignment = Math.min(
          Math.max(allocatedPieces, 0),
          remainingPieces
        )
        remainingPieces -= piecesForAssignment
        if (piecesForAssignment <= 0) {
          return []
        }
        return [
          {
            rollId,
            demandLineId: line.demandLineId,
            allocatedSets: Math.floor(
              piecesForAssignment / Math.max(line.pieceCountPerSet, 1)
            ),
            allocatedPieces: piecesForAssignment,
          },
        ]
      }
    )
  })
}

function buildLayoutRollSummaries(options: {
  plan: CuttingEngineOutput['plans'][number]
  rollIdByCoreRollId: Map<string, string>
  assignments: BatchOptimizerPlan['assignments']
  rollAreaM2: number
}) {
  const { plan, rollIdByCoreRollId, assignments, rollAreaM2 } = options
  return plan.rolls.map((roll) => {
    const mappedRollId = rollIdByCoreRollId.get(roll.rollId) || roll.rollId
    const rollAssignments = assignments.filter(
      (assignment) => assignment.rollId === mappedRollId
    )
    return {
      rollId: mappedRollId,
      allocatedSets: rollAssignments.reduce(
        (total, assignment) => total + assignment.allocatedSets,
        0
      ),
      allocatedPieces: roll.producedPieces,
      utilizedAreaM2: round(
        (rollAreaM2 * Math.max(roll.utilizationPercent, 0)) / 100,
        6
      ),
      utilizationPercent: roll.utilizationPercent,
      unusedAreaM2: roll.lossAreaM2,
      isUsed: roll.producedPieces > 0,
    }
  })
}

export function mapCuttingEngineOutputToBatchSolution(
  options: MapCuttingEngineOutputToBatchSolutionOptions
): BatchOptimizerSolveResponse {
  const { input, output, controls, selectedPrepregSpec, mappedDemandLines } =
    options
  const rollAreaM2 = round(
    (input.rollWidthMm * input.rollLengthMm) / 1_000_000,
    6
  )
  const appliedWeights = buildAppliedWeights(controls)
  const searchConfig = buildSearchConfig()
  const candidateBudgetSummary = buildCandidateBudgetSummary(
    output.plans.length
  )
  const explainabilitySummary = buildExplainabilitySummary()

  const plans = output.plans.map<BatchOptimizerPlan>((plan, index) => {
    const rank = index + 1
    const demandLineId = resolvePlanDemandLineId(plan, input)
    const rollIdByCoreRollId = buildPlanRollIdIndex({
      plan,
      selectedPrepregSpec,
    })
    const { allocatedPiecesByDemandLine, zoneIdsByDemandLine } =
      buildPlanDemandAllocationIndex({
        plan,
        fallbackDemandLineId: demandLineId,
        rollIdByCoreRollId,
      })
    const layoutZones = plan.zones.map((zone) => {
      const zoneDemandLineId = resolveZoneDemandLineId(zone, demandLineId)
      const zoneRollId = rollIdByCoreRollId.get(zone.rollId) || zone.rollId
      const zoneDemand = mappedDemandLines.validLines.find(
        (line) => line.demandLineId === zoneDemandLineId
      )
      const zoneAllocatedPieces = resolveZoneAllocatedPieces(zone)
      const zoneCoverageSharePercent = zoneDemand
        ? percent(zoneAllocatedPieces, zoneDemand.requiredPieces)
        : 0
      return buildLayoutZone(
        zone,
        zoneRollId,
        zoneDemandLineId,
        zoneAllocatedPieces,
        zoneCoverageSharePercent
      )
    })
    const geometryZones = plan.zones.map((zone) => {
      const zoneDemandLineId = resolveZoneDemandLineId(zone, demandLineId)
      const zoneRollId = rollIdByCoreRollId.get(zone.rollId) || zone.rollId
      const zoneDemand = mappedDemandLines.validLines.find(
        (line) => line.demandLineId === zoneDemandLineId
      )
      const zoneAllocatedPieces = resolveZoneAllocatedPieces(zone)
      const zoneCoverageSharePercent = zoneDemand
        ? percent(zoneAllocatedPieces, zoneDemand.requiredPieces)
        : 0
      return buildGeometryZone(
        zone,
        zoneRollId,
        zoneDemandLineId,
        zoneAllocatedPieces,
        zoneCoverageSharePercent
      )
    })
    const demandSummaries = mappedDemandLines.validLines.map((line) =>
      buildDemandSummary(
        line,
        new Map(
          Array.from(
            allocatedPiecesByDemandLine.get(line.demandLineId) || new Map()
          ).map(([rollId, allocatedPieces]) => [
            rollId,
            {
              allocatedPieces,
              zoneIds:
                zoneIdsByDemandLine.get(line.demandLineId)?.get(rollId) || [],
            },
          ])
        )
      )
    )
    const unfulfilledLines = buildUnfulfilledLines(demandSummaries)
    const assignments = buildPlanAssignments({
      validLines: mappedDemandLines.validLines,
      allocatedPiecesByDemandLine,
    })
    const demandSummaryById = new Map(
      demandSummaries.map((summary) => [summary.demandLineId, summary])
    )
    const mustFulfillDiagnostics = mappedDemandLines.validLines.flatMap(
      (line) =>
        buildMustFulfillDiagnostics({
          activeDemand: line,
          producedPieces:
            demandSummaryById.get(line.demandLineId)?.allocatedPieces || 0,
          mustFulfillSatisfied:
            demandSummaryById.get(line.demandLineId)?.fulfilled || false,
        })
    )
    const fulfilledDemandCount = demandSummaries.filter(
      (line) => line.fulfilled
    ).length
    const layoutRolls = buildLayoutRollSummaries({
      plan,
      rollIdByCoreRollId,
      assignments,
      rollAreaM2,
    })
    const usedRollCount = plan.rolls.filter(
      (roll) => roll.producedPieces > 0
    ).length
    const comparisonSummary = {
      fulfilledDemandCount,
      mustFulfillSatisfied: plan.mustFulfillSatisfied,
      splitDemandCount: demandSummaries.filter(
        (line) => line.isSplitAcrossRolls
      ).length,
      usedRollCount,
      usedRollPercent: percent(usedRollCount, plan.rolls.length),
      unusedRollAreaM2: round(
        plan.rolls.reduce((total, roll) => total + roll.lossAreaM2, 0),
        6
      ),
      unfulfilledAreaM2: round(
        unfulfilledLines.reduce((total, line) => {
          const demand = mappedDemandLines.validLines.find(
            (item) => item.demandLineId === line.demandLineId
          )
          return (
            total + (demand?.occupiedPieceAreaM2 ?? 0) * line.remainingPieces
          )
        }, 0),
        6
      ),
      trimLossAreaM2: 0,
    }
    const fulfilledRatePercent = percent(
      fulfilledDemandCount,
      demandSummaries.length
    )
    const scoreBreakdown = buildScoreBreakdown(
      plan,
      controls,
      appliedWeights,
      fulfilledRatePercent
    )
    const diffSummary = buildDiffSummary(rank)
    const reportSummary = buildReportSummary({
      rank,
      plan,
      appliedWeights,
      searchConfig,
      candidateBudgetSummary,
      explainabilitySummary,
      scoreBreakdown,
      comparisonSummary,
    })

    return {
      rank,
      strategyKey: RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY,
      score: plan.score,
      utilizationPercent: plan.utilizationPercent,
      lossAreaM2: plan.lossAreaM2,
      explanation: plan.warnings.length
        ? plan.warnings.join('；')
        : 'Rust/WASM 单卷/多卷矩形贪心输出',
      assignments,
      unfulfilledLines,
      layoutSummary: {
        canvasWidthMm: input.rollWidthMm,
        canvasHeightMm: input.rollLengthMm,
        rollCount: plan.rolls.length,
        assignmentCount: assignments.length,
        fulfilledDemandLineCount: fulfilledDemandCount,
        unfulfilledDemandLineCount: unfulfilledLines.length,
        rolls: layoutRolls,
        demandLines: demandSummaries,
        zones: layoutZones,
      },
      geometryLayoutSummary: {
        canvasWidthMm: input.rollWidthMm,
        canvasHeightMm: input.rollLengthMm,
        zones: geometryZones,
      },
      lossBreakdown: {
        unusedRollAreaM2: plan.lossAreaM2,
        unfulfilledAreaM2: comparisonSummary.unfulfilledAreaM2,
        trimLossAreaM2: 0,
        message: 'Rust/WASM 几何核心损耗统计',
      },
      comparisonSummary,
      scoreBreakdown,
      mustFulfillDiagnostics,
      diffSummary,
      diffSummaries: [diffSummary],
      searchConfig,
      candidateBudgetSummary,
      budgetRerankReason: '',
      explainabilitySummary,
      reportSummary,
    }
  })

  return {
    requestId: `rust-wasm-${Date.now()}`,
    summary: {
      solverStatus: plans.length
        ? RUST_WASM_CUTTING_ENGINE_SOLVER_STATUS
        : 'NO_PLAN',
      message: buildRustWasmCuttingEngineSummaryMessage({
        eligibleDemandLineCount: mappedDemandLines.validLines.length,
        returnedPlanCount: plans.length,
        warnings: output.warnings,
      }),
      planCount: plans.length,
    },
    plans,
  }
}

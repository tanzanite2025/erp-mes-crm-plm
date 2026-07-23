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

function resolveZoneAllocatedPieces(
  zone: CuttingEngineOutput['plans'][number]['zones'][number]
) {
  return zone.kind === 'Material' ? Math.max(zone.allocatedPieces, 0) : 0
}

function buildPlanDemandAllocationIndex(options: {
  plan: CuttingEngineOutput['plans'][number]
  fallbackDemandLineId: string
}) {
  const { plan, fallbackDemandLineId } = options
  const allocatedPiecesByDemandLine = new Map<string, number>()
  const zoneIdsByDemandLine = new Map<string, string[]>()

  for (const zone of plan.zones) {
    if (zone.kind !== 'Material') {
      continue
    }
    const demandLineId = resolveZoneDemandLineId(zone, fallbackDemandLineId)
    const allocatedPieces = resolveZoneAllocatedPieces(zone)
    allocatedPiecesByDemandLine.set(
      demandLineId,
      (allocatedPiecesByDemandLine.get(demandLineId) || 0) + allocatedPieces
    )
    const zoneIds = zoneIdsByDemandLine.get(demandLineId) || []
    zoneIds.push(zone.id)
    zoneIdsByDemandLine.set(demandLineId, zoneIds)
  }

  return {
    allocatedPiecesByDemandLine,
    zoneIdsByDemandLine,
  }
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
    const { allocatedPiecesByDemandLine, zoneIdsByDemandLine } =
      buildPlanDemandAllocationIndex({
        plan,
        fallbackDemandLineId: demandLineId,
      })
    const layoutZones = plan.zones.map((zone) => {
      const zoneDemandLineId = resolveZoneDemandLineId(zone, demandLineId)
      const zoneDemand = mappedDemandLines.validLines.find(
        (line) => line.demandLineId === zoneDemandLineId
      )
      const zoneAllocatedPieces = resolveZoneAllocatedPieces(zone)
      const zoneCoverageSharePercent = zoneDemand
        ? percent(zoneAllocatedPieces, zoneDemand.requiredPieces)
        : 0
      return buildLayoutZone(
        zone,
        zoneDemandLineId,
        zoneAllocatedPieces,
        zoneCoverageSharePercent
      )
    })
    const geometryZones = plan.zones.map((zone) => {
      const zoneDemandLineId = resolveZoneDemandLineId(zone, demandLineId)
      const zoneDemand = mappedDemandLines.validLines.find(
        (line) => line.demandLineId === zoneDemandLineId
      )
      const zoneAllocatedPieces = resolveZoneAllocatedPieces(zone)
      const zoneCoverageSharePercent = zoneDemand
        ? percent(zoneAllocatedPieces, zoneDemand.requiredPieces)
        : 0
      return buildGeometryZone(
        zone,
        zoneDemandLineId,
        zoneAllocatedPieces,
        zoneCoverageSharePercent
      )
    })
    const demandSummaries = mappedDemandLines.validLines.map((line) =>
      buildDemandSummary(
        line,
        allocatedPiecesByDemandLine.get(line.demandLineId) || 0,
        zoneIdsByDemandLine.get(line.demandLineId) || []
      )
    )
    const unfulfilledLines = buildUnfulfilledLines(demandSummaries)
    const assignments = mappedDemandLines.validLines
      .map((line) => {
        const allocatedPieces = Math.min(
          allocatedPiecesByDemandLine.get(line.demandLineId) || 0,
          line.requiredPieces
        )
        if (allocatedPieces <= 0) {
          return null
        }
        return {
          rollId: 'rust-wasm-roll-1',
          demandLineId: line.demandLineId,
          allocatedSets: Math.floor(
            allocatedPieces / Math.max(line.pieceCountPerSet, 1)
          ),
          allocatedPieces,
        }
      })
      .filter(
        (
          assignment
        ): assignment is {
          rollId: string
          demandLineId: string
          allocatedSets: number
          allocatedPieces: number
        } => Boolean(assignment)
      )
    const mustFulfillDiagnostics = mappedDemandLines.validLines.flatMap(
      (line) =>
        buildMustFulfillDiagnostics({
          activeDemand: line,
          producedPieces:
            allocatedPiecesByDemandLine.get(line.demandLineId) || 0,
          mustFulfillSatisfied:
            (allocatedPiecesByDemandLine.get(line.demandLineId) || 0) >=
            line.requiredPieces,
        })
    )
    const fulfilledDemandCount = demandSummaries.filter(
      (line) => line.fulfilled
    ).length
    const comparisonSummary = {
      fulfilledDemandCount,
      mustFulfillSatisfied: plan.mustFulfillSatisfied,
      splitDemandCount: 0,
      usedRollCount: plan.producedPieces > 0 ? 1 : 0,
      usedRollPercent: plan.producedPieces > 0 ? 100 : 0,
      unusedRollAreaM2: plan.lossAreaM2,
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
        : 'Rust/WASM 单卷多需求行矩形贪心输出',
      assignments,
      unfulfilledLines,
      layoutSummary: {
        canvasWidthMm: input.rollWidthMm,
        canvasHeightMm: input.rollLengthMm,
        rollCount: 1,
        assignmentCount: assignments.length,
        fulfilledDemandLineCount: fulfilledDemandCount,
        unfulfilledDemandLineCount: unfulfilledLines.length,
        rolls: [
          {
            rollId: selectedPrepregSpec?.id || 'rust-wasm-roll-1',
            allocatedSets: assignments.reduce(
              (total, item) => total + item.allocatedSets,
              0
            ),
            allocatedPieces: plan.producedPieces,
            utilizedAreaM2: round(rollAreaM2 - plan.lossAreaM2, 6),
            utilizationPercent: plan.utilizationPercent,
            unusedAreaM2: plan.lossAreaM2,
            isUsed: plan.producedPieces > 0,
          },
        ],
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

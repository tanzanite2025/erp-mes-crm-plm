import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls } from '../types'
import type {
  BatchOptimizerMustFulfillDiagnostic,
  BatchOptimizerPlan,
  BatchOptimizerSolveResponse,
} from '../types/batch-engine-api'
import type { CuttingEngineInput, CuttingEngineOutput } from '../types/cutting-engine-wasm'
import {
  buildDemandSummary,
  buildUnfulfilledLines,
  resolvePlanDemandLineId,
} from './cutting-engine-output-mapper/demands'
import { buildGeometryZone, buildLayoutZone } from './cutting-engine-output-mapper/layout'
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
      reasonCode: mustFulfillSatisfied ? 'must_fulfill_satisfied' : 'must_fulfill_unmet',
      message: mustFulfillSatisfied
        ? `MustFulfill 需求已生产 ${producedPieces}/${activeDemand.requiredPieces} 件。`
        : `MustFulfill 需求仅生产 ${producedPieces}/${activeDemand.requiredPieces} 件。`,
      blockingConstraintCode: mustFulfillSatisfied ? 'none' : 'capacity',
      blockingConstraint: mustFulfillSatisfied ? '无阻断约束' : '产能或几何约束限制',
      suggestion: mustFulfillSatisfied
        ? '无需处理。'
        : '可切换 strict 模式拒绝该方案，或提升卷材容量 / 放宽几何约束。',
    },
  ]
}

export function mapCuttingEngineOutputToBatchSolution(
  options: MapCuttingEngineOutputToBatchSolutionOptions
): BatchOptimizerSolveResponse {
  const { input, output, controls, selectedPrepregSpec, mappedDemandLines } = options
  const rollAreaM2 = round((input.rollWidthMm * input.rollLengthMm) / 1_000_000, 6)
  const appliedWeights = buildAppliedWeights(controls)
  const searchConfig = buildSearchConfig()
  const candidateBudgetSummary = buildCandidateBudgetSummary(output.plans.length)
  const explainabilitySummary = buildExplainabilitySummary()

  const plans = output.plans.map<BatchOptimizerPlan>((plan, index) => {
    const rank = index + 1
    const demandLineId = resolvePlanDemandLineId(plan, input)
    const activeDemand = mappedDemandLines.validLines.find((line) => line.demandLineId === demandLineId)
    const activeRequiredPieces = activeDemand?.requiredPieces ?? plan.producedPieces
    const coverageSharePercent = percent(plan.producedPieces, activeRequiredPieces)
    const materialZoneIds = plan.zones.filter((zone) => zone.kind === 'Material').map((zone) => zone.id)
    const layoutZones = plan.zones.map((zone) => buildLayoutZone(zone, demandLineId, plan.producedPieces, coverageSharePercent))
    const geometryZones = plan.zones.map((zone) => buildGeometryZone(zone, demandLineId, plan.producedPieces, coverageSharePercent))
    const demandSummaries = mappedDemandLines.validLines.map((line) => buildDemandSummary(line, demandLineId, plan.producedPieces, materialZoneIds))
    const unfulfilledLines = buildUnfulfilledLines(demandSummaries)
    const assignments = activeDemand && plan.producedPieces > 0
      ? [
        {
          rollId: 'rust-wasm-roll-1',
          demandLineId,
          allocatedSets: Math.floor(plan.producedPieces / Math.max(activeDemand.pieceCountPerSet, 1)),
          allocatedPieces: Math.min(plan.producedPieces, activeDemand.requiredPieces),
        },
      ]
      : []
    const mustFulfillDiagnostics = buildMustFulfillDiagnostics({
      activeDemand,
      producedPieces: plan.producedPieces,
      mustFulfillSatisfied: plan.mustFulfillSatisfied,
    })
    const fulfilledDemandCount = demandSummaries.filter((line) => line.fulfilled).length
    const comparisonSummary = {
      fulfilledDemandCount,
      mustFulfillSatisfied: plan.mustFulfillSatisfied,
      splitDemandCount: 0,
      usedRollCount: plan.producedPieces > 0 ? 1 : 0,
      usedRollPercent: plan.producedPieces > 0 ? 100 : 0,
      unusedRollAreaM2: plan.lossAreaM2,
      unfulfilledAreaM2: round(unfulfilledLines.reduce((total, line) => {
        const demand = mappedDemandLines.validLines.find((item) => item.demandLineId === line.demandLineId)
        return total + (demand?.occupiedPieceAreaM2 ?? 0) * line.remainingPieces
      }, 0), 6),
      trimLossAreaM2: 0,
    }
    const fulfilledRatePercent = percent(fulfilledDemandCount, demandSummaries.length)
    const scoreBreakdown = buildScoreBreakdown(plan, controls, appliedWeights, fulfilledRatePercent)
    const diffSummary = buildDiffSummary(rank)
    const reportSummary = buildReportSummary({
      rank,
      plan,
      controls,
      appliedWeights,
      searchConfig,
      candidateBudgetSummary,
      explainabilitySummary,
      scoreBreakdown,
      comparisonSummary,
    })

    return {
      rank,
      strategyKey: 'rust-wasm-cutting-core',
      score: plan.score,
      utilizationPercent: plan.utilizationPercent,
      lossAreaM2: plan.lossAreaM2,
      explanation: plan.warnings.length ? plan.warnings.join('；') : 'Rust/WASM 裁纱核心输出',
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
            allocatedSets: assignments.reduce((total, item) => total + item.allocatedSets, 0),
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
      solverStatus: plans.length ? 'SOLVED_BY_RUST_WASM' : 'NO_PLAN',
      message: output.warnings.length ? output.warnings.join('；') : 'Rust/WASM 裁纱核心已完成求解',
      planCount: plans.length,
    },
    plans,
  }
}

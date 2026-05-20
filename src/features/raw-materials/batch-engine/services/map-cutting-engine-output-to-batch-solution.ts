import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineNormalizedControls } from '../types'
import type {
  BatchOptimizerCandidateBudgetSummary,
  BatchOptimizerDemandLineInput,
  BatchOptimizerGeometryLayoutZone,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
  BatchOptimizerPlanExplainabilitySummary,
  BatchOptimizerPlanLayoutDemandSummary,
  BatchOptimizerPlanLayoutZone,
  BatchOptimizerPlanReportSummary,
  BatchOptimizerPlanScoreBreakdown,
  BatchOptimizerScoreWeights,
  BatchOptimizerSearchConfigSummary,
  BatchOptimizerSolveResponse,
  BatchOptimizerUnfulfilledLine,
} from '../types/batch-engine-api'
import type { CuttingEngineInput, CuttingEngineOutput, CuttingLayoutZone, CuttingPlan as CuttingEnginePlan } from '../types/cutting-engine-wasm'

type MapCuttingEngineOutputToBatchSolutionOptions = {
  input: CuttingEngineInput
  output: CuttingEngineOutput
  controls: BatchEngineNormalizedControls
  selectedPrepregSpec?: PrepregMaterialSpec
  mappedDemandLines: BuildBatchEngineDemandLinesResult
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return round((value / total) * 100, 3)
}

function buildAppliedWeights(controls: BatchEngineNormalizedControls): BatchOptimizerScoreWeights {
  return {
    fulfilledWeight: 0,
    utilizationWeight: controls.utilizationWeight,
    stabilityWeight: controls.stabilityWeight,
    assignmentPenaltyWeight: 0,
    unfulfilledPenaltyWeight: 0,
    splitPenaltyWeight: controls.splitPenaltyWeight,
    mustPenaltyWeight: 0,
  }
}

function resolvePlanDemandLineId(plan: CuttingEnginePlan, input: CuttingEngineInput) {
  const fromPlanId = plan.planId.startsWith('plan-') ? plan.planId.slice(5) : plan.planId
  if (input.cutUnits.some((unit) => unit.id === fromPlanId)) {
    return fromPlanId
  }
  const materialZone = plan.zones.find((zone) => zone.kind === 'Material')
  const fromZoneId = materialZone?.id.startsWith('material-') ? materialZone.id.slice(9) : materialZone?.id
  return fromZoneId || fromPlanId
}

function toZoneKind(zone: CuttingLayoutZone) {
  if (zone.kind === 'Roll') return 'roll'
  if (zone.kind === 'Loss') return 'loss'
  return 'piece'
}

function toUsageCategory(zone: CuttingLayoutZone) {
  if (zone.kind === 'Roll') return 'roll'
  if (zone.kind === 'Loss') return 'loss'
  return 'piece'
}

function toPolygonPoints(zone: CuttingLayoutZone) {
  return [
    { x: zone.xMm, y: zone.yMm },
    { x: zone.xMm + zone.widthMm, y: zone.yMm },
    { x: zone.xMm + zone.widthMm, y: zone.yMm + zone.heightMm },
    { x: zone.xMm, y: zone.yMm + zone.heightMm },
  ]
}

function buildLayoutZone(
  zone: CuttingLayoutZone,
  demandLineId: string,
  allocatedPieces: number,
  coverageSharePercent: number
): BatchOptimizerPlanLayoutZone {
  const isMaterial = zone.kind === 'Material'
  const areaM2 = round((zone.widthMm * zone.heightMm) / 1_000_000, 6)
  return {
    id: zone.id,
    kind: toZoneKind(zone),
    usageCategory: toUsageCategory(zone),
    label: zone.label,
    detail: `${round(zone.widthMm, 1)}mm x ${round(zone.heightMm, 1)}mm`,
    rollId: 'rust-wasm-roll-1',
    demandLineId: isMaterial ? demandLineId : undefined,
    areaM2,
    allocatedSets: 0,
    allocatedPieces: isMaterial ? allocatedPieces : 0,
    coverageSharePercent: isMaterial ? coverageSharePercent : 0,
    tooltipLines: [zone.label, `${round(areaM2, 3)} m2`],
    x: zone.xMm,
    y: zone.yMm,
    width: zone.widthMm,
    height: zone.heightMm,
  }
}

function buildGeometryZone(
  zone: CuttingLayoutZone,
  demandLineId: string,
  allocatedPieces: number,
  coverageSharePercent: number
): BatchOptimizerGeometryLayoutZone {
  const layoutZone = buildLayoutZone(zone, demandLineId, allocatedPieces, coverageSharePercent)
  return {
    id: layoutZone.id,
    kind: layoutZone.kind,
    usageCategory: layoutZone.usageCategory,
    label: layoutZone.label,
    detail: layoutZone.detail,
    rollId: layoutZone.rollId,
    demandLineId: layoutZone.demandLineId,
    areaM2: layoutZone.areaM2,
    allocatedSets: layoutZone.allocatedSets,
    allocatedPieces: layoutZone.allocatedPieces,
    coverageSharePercent: layoutZone.coverageSharePercent,
    tooltipLines: layoutZone.tooltipLines,
    polygonPoints: toPolygonPoints(zone),
  }
}

function buildDiffSummary(rank: number): BatchOptimizerPlanDiffSummary {
  return {
    baselinePlanRank: rank,
    baselineStrategyKey: 'rust-wasm-cutting-core',
    mode: 'none',
    addedZoneIds: [],
    removedZoneIds: [],
    changedDemandLineIds: [],
    changedRollIds: [],
    highlightZoneIds: [],
  }
}

function buildSearchConfig(): BatchOptimizerSearchConfigSummary {
  return {
    presetKey: 'rust-wasm-cutting-core',
    beamWidth: 0,
    maxSearchDepth: 0,
    perDemandBranchingLimit: 0,
    residualReuseBias: 0,
    convergenceAreaBucketM2: 0,
  }
}

function buildCandidateBudgetSummary(planCount: number): BatchOptimizerCandidateBudgetSummary {
  return {
    perStrategyQuota: planCount,
    globalBudget: planCount,
    mergedCandidateCount: planCount,
    strategyStats: [
      {
        strategyKey: 'rust-wasm-cutting-core',
        inputCount: planCount,
        keptCount: planCount,
      },
    ],
    dynamicStrategyStats: [],
  }
}

function buildExplainabilitySummary(): BatchOptimizerPlanExplainabilitySummary {
  return {
    groupSegments: [],
    sequenceSegments: [],
    adjacencySegments: [],
    primaryBreakReasons: [],
    heatZoneAttributions: [],
    breakSlices: [],
    zoneClusters: [],
  }
}

function buildScoreBreakdown(
  plan: CuttingEnginePlan,
  controls: BatchEngineNormalizedControls,
  appliedWeights: BatchOptimizerScoreWeights,
  fulfilledRatePercent: number
): BatchOptimizerPlanScoreBreakdown {
  return {
    objectivePreset: controls.objectivePreset,
    appliedWeights,
    fulfilledRatePercent,
    fulfilledContribution: 0,
    utilizationContribution: round(plan.utilizationPercent * controls.utilizationWeight, 3),
    stabilityContribution: 0,
    assignmentPenalty: 0,
    unfulfilledPenalty: 0,
    splitPenalty: round(plan.lossAreaM2 * controls.splitPenaltyWeight, 3),
    mustFulfillPenalty: 0,
    groupSplitCount: 0,
    sequenceViolationCount: 0,
    adjacencyBreakCount: 0,
    directionSwitchCount: 0,
    mixViolationCount: 0,
    rollSwitchCount: 0,
    geometryReuseHitCount: 0,
    reusableResidualAreaM2: 0,
    finalScore: plan.score,
  }
}

function buildReportSummary(options: {
  rank: number
  plan: CuttingEnginePlan
  controls: BatchEngineNormalizedControls
  appliedWeights: BatchOptimizerScoreWeights
  searchConfig: BatchOptimizerSearchConfigSummary
  candidateBudgetSummary: BatchOptimizerCandidateBudgetSummary
  explainabilitySummary: BatchOptimizerPlanExplainabilitySummary
  scoreBreakdown: BatchOptimizerPlanScoreBreakdown
  comparisonSummary: BatchOptimizerPlan['comparisonSummary']
}): BatchOptimizerPlanReportSummary {
  const {
    rank,
    plan,
    controls,
    appliedWeights,
    searchConfig,
    candidateBudgetSummary,
    explainabilitySummary,
    scoreBreakdown,
    comparisonSummary,
  } = options
  return {
    planRank: rank,
    strategyKey: 'rust-wasm-cutting-core',
    objectivePreset: controls.objectivePreset,
    appliedWeights,
    baselinePlanRank: rank,
    baselineStrategyKey: 'rust-wasm-cutting-core',
    score: plan.score,
    utilizationPercent: plan.utilizationPercent,
    lossAreaM2: plan.lossAreaM2,
    mustFulfillRiskCount: 0,
    changedDemandLineCount: 0,
    changedRollCount: 0,
    highlightZoneCount: 0,
    adjacencyBreakCount: 0,
    rollSwitchCount: 0,
    geometryReuseHitCount: 0,
    reusableResidualAreaM2: 0,
    searchConfig,
    candidateBudgetSummary,
    budgetRerankReason: '',
    explainabilitySummary,
    comparisonSummary,
    scoreBreakdown,
  }
}

function buildDemandSummary(
  demandLine: BatchOptimizerDemandLineInput,
  activeDemandLineId: string,
  producedPieces: number,
  zoneIds: string[]
): BatchOptimizerPlanLayoutDemandSummary {
  const isActive = demandLine.demandLineId === activeDemandLineId
  const allocatedPieces = isActive ? Math.min(producedPieces, demandLine.requiredPieces) : 0
  const remainingPieces = Math.max(demandLine.requiredPieces - allocatedPieces, 0)
  const pieceCountPerSet = Math.max(demandLine.pieceCountPerSet, 1)
  return {
    demandLineId: demandLine.demandLineId,
    allocatedSets: Math.floor(allocatedPieces / pieceCountPerSet),
    allocatedPieces,
    rollCount: allocatedPieces > 0 ? 1 : 0,
    remainingSets: Math.ceil(remainingPieces / pieceCountPerSet),
    remainingPieces,
    requiredSets: demandLine.requiredSets,
    requiredPieces: demandLine.requiredPieces,
    fulfilled: remainingPieces <= 0,
    mustFulfill: false,
    isSplitAcrossRolls: false,
    coveragePercent: percent(allocatedPieces, demandLine.requiredPieces),
    usageType: demandLine.usageType || 'geometry',
    priority: demandLine.priority,
    rollIds: allocatedPieces > 0 ? ['rust-wasm-roll-1'] : [],
    zoneIds: allocatedPieces > 0 ? zoneIds : [],
  }
}

function buildUnfulfilledLines(demandSummaries: BatchOptimizerPlanLayoutDemandSummary[]): BatchOptimizerUnfulfilledLine[] {
  return demandSummaries
    .filter((line) => line.remainingPieces > 0)
    .map((line) => ({
      demandLineId: line.demandLineId,
      remainingSets: line.remainingSets,
      remainingPieces: line.remainingPieces,
      reason: 'Rust/WASM 几何核心当前方案未覆盖该需求行',
    }))
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
    const fulfilledDemandCount = demandSummaries.filter((line) => line.fulfilled).length
    const comparisonSummary = {
      fulfilledDemandCount,
      mustFulfillSatisfied: true,
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
      mustFulfillDiagnostics: [],
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

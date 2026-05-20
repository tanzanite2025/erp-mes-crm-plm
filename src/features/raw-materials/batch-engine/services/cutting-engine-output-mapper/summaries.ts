import type { BatchEngineNormalizedControls } from '../../types'
import type {
  BatchOptimizerCandidateBudgetSummary,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
  BatchOptimizerPlanExplainabilitySummary,
  BatchOptimizerPlanReportSummary,
  BatchOptimizerPlanScoreBreakdown,
  BatchOptimizerScoreWeights,
  BatchOptimizerSearchConfigSummary,
} from '../../types/batch-engine-api'
import type { CuttingPlan as CuttingEnginePlan } from '../../types/cutting-engine-wasm'
import { round } from './math'

export function buildAppliedWeights(controls: BatchEngineNormalizedControls): BatchOptimizerScoreWeights {
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

export function buildDiffSummary(rank: number): BatchOptimizerPlanDiffSummary {
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

export function buildSearchConfig(): BatchOptimizerSearchConfigSummary {
  return {
    presetKey: 'rust-wasm-cutting-core',
    beamWidth: 0,
    maxSearchDepth: 0,
    perDemandBranchingLimit: 0,
    residualReuseBias: 0,
    convergenceAreaBucketM2: 0,
  }
}

export function buildCandidateBudgetSummary(planCount: number): BatchOptimizerCandidateBudgetSummary {
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

export function buildExplainabilitySummary(): BatchOptimizerPlanExplainabilitySummary {
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

export function buildScoreBreakdown(
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
    directionSwitchCount: plan.directionSwitchCount,
    mixViolationCount: plan.angleMixViolationCount,
    rollSwitchCount: 0,
    geometryReuseHitCount: 0,
    reusableResidualAreaM2: 0,
    finalScore: plan.score,
  }
}

export function buildReportSummary(options: {
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

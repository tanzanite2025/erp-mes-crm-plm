import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'

export function getActiveDiffSummary(
  plan: BatchOptimizerPlan,
  baselinePlanRank?: number | null
): BatchOptimizerPlanDiffSummary {
  if (!baselinePlanRank) {
    return plan.diffSummary
  }
  return plan.diffSummaries.find((item) => item.baselinePlanRank === baselinePlanRank) ?? plan.diffSummary
}

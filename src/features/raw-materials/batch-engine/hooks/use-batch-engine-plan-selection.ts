import { useMemo, useState } from 'react'
import { getActiveDiffSummary } from '../services/batch-engine-diff'
import type { BatchOptimizerPlan, BatchOptimizerSolveResponse } from '../types'

export type BatchEngineSelectedPlanContext = {
  selectedPlan?: BatchOptimizerPlan
  selectedPlanRank: number | null
  baselinePlanRank: number | null
  activeDiffSummary: BatchOptimizerPlan['diffSummary'] | undefined
  effectiveDiffSummary: BatchOptimizerPlan['diffSummary'] | undefined
  breakSliceCount: number
  zoneClusterCount: number
  dynamicStrategyCount: number
}

type UseBatchEnginePlanSelectionOptions = {
  solution?: BatchOptimizerSolveResponse
}

export function useBatchEnginePlanSelection(
  options: UseBatchEnginePlanSelectionOptions
) {
  const { solution } = options
  const [selectedPlanRank, setSelectedPlanRank] = useState<number | null>(null)
  const [baselinePlanRank, setBaselinePlanRank] = useState<number | null>(null)

  const selectedPlan = useMemo<BatchOptimizerPlan | undefined>(() => {
    if (!solution?.plans.length) {
      return undefined
    }
    return (
      solution.plans.find((plan) => plan.rank === selectedPlanRank) ??
      solution.plans[0]
    )
  }, [selectedPlanRank, solution])

  const activeBaselinePlanRank = useMemo(() => {
    if (!solution?.plans.length) {
      return null
    }
    if (
      baselinePlanRank &&
      solution.plans.some((plan) => plan.rank === baselinePlanRank)
    ) {
      return baselinePlanRank
    }
    return solution.plans[0]?.rank ?? null
  }, [baselinePlanRank, solution])

  const activeDiffSummary = useMemo(() => {
    if (!selectedPlan) {
      return undefined
    }
    return getActiveDiffSummary(selectedPlan, activeBaselinePlanRank)
  }, [activeBaselinePlanRank, selectedPlan])

  const selectedPlanContext = useMemo<BatchEngineSelectedPlanContext>(
    () => ({
      selectedPlan,
      selectedPlanRank: selectedPlan?.rank ?? null,
      baselinePlanRank: activeBaselinePlanRank,
      activeDiffSummary,
      effectiveDiffSummary: activeDiffSummary,
      breakSliceCount:
        selectedPlan?.explainabilitySummary.breakSlices.length ?? 0,
      zoneClusterCount:
        selectedPlan?.explainabilitySummary.zoneClusters.length ?? 0,
      dynamicStrategyCount:
        selectedPlan?.candidateBudgetSummary.dynamicStrategyStats.length ?? 0,
    }),
    [activeBaselinePlanRank, activeDiffSummary, selectedPlan]
  )

  return {
    selectedPlanRank: selectedPlanContext.selectedPlanRank,
    selectedPlanContext,
    selectPlan: (rank: number) => setSelectedPlanRank(rank),
    selectBaselinePlan: (rank: number) => setBaselinePlanRank(rank),
  }
}

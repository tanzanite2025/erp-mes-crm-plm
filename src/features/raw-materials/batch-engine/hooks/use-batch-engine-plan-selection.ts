import { useMemo, useState } from 'react'
import type { BatchOptimizerPlan, BatchOptimizerSolveResponse } from '../types'
import { getActiveDiffSummary } from '../services/batch-engine-diff'

type UseBatchEnginePlanSelectionOptions = {
  solution?: BatchOptimizerSolveResponse
}

export function useBatchEnginePlanSelection(options: UseBatchEnginePlanSelectionOptions) {
  const { solution } = options
  const [selectedPlanRank, setSelectedPlanRank] = useState<number | null>(null)
  const [baselinePlanRank, setBaselinePlanRank] = useState<number | null>(null)

  const selectedPlan = useMemo<BatchOptimizerPlan | undefined>(() => {
    if (!solution?.plans.length) {
      return undefined
    }
    return solution.plans.find((plan) => plan.rank === selectedPlanRank) ?? solution.plans[0]
  }, [selectedPlanRank, solution])
  const activeBaselinePlanRank = baselinePlanRank ?? solution?.plans[0]?.rank ?? null
  const activeDiffSummary = useMemo(() => {
    if (!selectedPlan) {
      return undefined
    }
    return getActiveDiffSummary(selectedPlan, activeBaselinePlanRank)
  }, [activeBaselinePlanRank, selectedPlan])

  return {
    selectedPlanRank: selectedPlan?.rank ?? null,
    selectedPlan,
    baselinePlanRank: activeBaselinePlanRank,
    activeDiffSummary,
    selectPlan: (rank: number) => setSelectedPlanRank(rank),
    selectBaselinePlan: (rank: number) => setBaselinePlanRank(rank),
  }
}

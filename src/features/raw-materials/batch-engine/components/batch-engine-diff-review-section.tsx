import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'
import { BatchEngineDiffBaselineSelector } from './batch-engine-diff-baseline-selector'
import { BatchEnginePlanComparePanel } from './batch-engine-plan-compare-panel'

type BatchEngineDiffReviewSectionProps = {
  plans: BatchOptimizerPlan[]
  selectedPlanRank: number | null
  baselinePlanRank: number | null
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  onSelectPlan: (rank: number) => void
  onSelectBaselinePlan: (rank: number) => void
}

export function BatchEngineDiffReviewSection(props: BatchEngineDiffReviewSectionProps) {
  const {
    plans,
    selectedPlanRank,
    baselinePlanRank,
    selectedPlan,
    activeDiffSummary,
    onSelectPlan,
    onSelectBaselinePlan,
  } = props

  if (!plans.length) {
    return null
  }

  return (
    <div className='grid gap-4'>
      <BatchEnginePlanComparePanel
        plans={plans}
        selectedPlanRank={selectedPlanRank}
        baselinePlanRank={baselinePlanRank}
        onSelectPlan={onSelectPlan}
      />

      <BatchEngineDiffBaselineSelector
        plans={plans}
        baselinePlanRank={baselinePlanRank}
        onChangeBaselinePlan={onSelectBaselinePlan}
      />

      {selectedPlan ? (
        <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
          <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>候选差异摘要</p>
          <div className='mt-3 grid gap-1 text-xs font-semibold text-slate-700'>
            <p>新增区域: {(activeDiffSummary ?? selectedPlan.diffSummary).addedZoneIds.length}</p>
            <p>移除区域: {(activeDiffSummary ?? selectedPlan.diffSummary).removedZoneIds.length}</p>
            <p>变化需求: {(activeDiffSummary ?? selectedPlan.diffSummary).changedDemandLineIds.join(', ') || '--'}</p>
            <p>变化卷材: {(activeDiffSummary ?? selectedPlan.diffSummary).changedRollIds.join(', ') || '--'}</p>
            <p>差异热区: {(activeDiffSummary ?? selectedPlan.diffSummary).highlightZoneIds.length}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

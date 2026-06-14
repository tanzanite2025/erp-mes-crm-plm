import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEngineExportActions } from './batch-engine-export-actions'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewPlanOverviewCardProps = {
  displayState: BatchEnginePreviewDisplayState
}

export function BatchEnginePreviewPlanOverviewCard(
  props: BatchEnginePreviewPlanOverviewCardProps
) {
  const { displayState } = props
  const { selectedPlan, diffSummary } = displayState

  return (
    <BatchEnginePreviewStateCard
      title='方案概览'
      mode={displayState.mode}
      solvedContent={
        selectedPlan && diffSummary ? (
          <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
            <p>候选排名: #{selectedPlan.rank}</p>
            <p>策略: {selectedPlan.strategyKey}</p>
            <p>评分: {selectedPlan.score.toFixed(2)}</p>
            <p>利用率: {selectedPlan.utilizationPercent.toFixed(2)}%</p>
            <p>损耗: {selectedPlan.lossAreaM2.toFixed(3)} m2</p>
            <p>
              已满足需求行:{' '}
              {selectedPlan.layoutSummary.fulfilledDemandLineCount}
            </p>
            <p>
              未满足需求行:{' '}
              {selectedPlan.layoutSummary.unfulfilledDemandLineCount}
            </p>
            <p>相对基准: Top{diffSummary.baselinePlanRank}</p>
            <BatchEngineExportActions
              plan={selectedPlan}
              diffSummary={diffSummary}
              className='mt-2 flex flex-wrap gap-2'
              buttonClassName='inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700'
            />
          </div>
        ) : null
      }
      previewContent={
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>当前展示的是本地 preview 视图。</p>
          <p>正式求解后重新打开弹窗，可查看候选方案布局摘要。</p>
        </div>
      }
    />
  )
}

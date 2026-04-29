import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewDiffSummaryCardProps = {
  displayState: BatchEnginePreviewDisplayState
}

export function BatchEnginePreviewDiffSummaryCard(props: BatchEnginePreviewDiffSummaryCardProps) {
  const { displayState } = props
  const { selectedPlan, diffSummary } = displayState

  return (
    <BatchEnginePreviewStateCard
      title='候选差异摘要'
      mode={displayState.mode}
      solvedContent={selectedPlan && diffSummary ? (
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>新增区域: {diffSummary.addedZoneIds.length}</p>
          <p>移除区域: {diffSummary.removedZoneIds.length}</p>
          <p>变化需求: {diffSummary.changedDemandLineIds.join(', ') || '--'}</p>
          <p>变化卷材: {diffSummary.changedRollIds.join(', ') || '--'}</p>
          <p>热区数: {diffSummary.highlightZoneIds.length}</p>
          <p>Break Slice: {selectedPlan.explainabilitySummary.breakSlices.length}</p>
          <p>Zone Cluster: {selectedPlan.explainabilitySummary.zoneClusters.length}</p>
          <p>重排原因: {selectedPlan.budgetRerankReason || '--'}</p>
        </div>
      ) : null}
      previewContent={(
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>本地 preview 不包含正式候选差异摘要。</p>
        </div>
      )}
    />
  )
}

import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewLossBreakdownCardProps = {
  displayState: BatchEnginePreviewDisplayState
}

export function BatchEnginePreviewLossBreakdownCard(
  props: BatchEnginePreviewLossBreakdownCardProps
) {
  const { displayState } = props
  const { selectedPlan } = displayState

  return (
    <BatchEnginePreviewStateCard
      title='损耗构成'
      mode={displayState.mode}
      solvedContent={
        selectedPlan ? (
          <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
            <p>
              未用卷材面积:{' '}
              {selectedPlan.lossBreakdown.unusedRollAreaM2.toFixed(3)} m2
            </p>
            <p>
              未满足需求面积:{' '}
              {selectedPlan.lossBreakdown.unfulfilledAreaM2.toFixed(3)} m2
            </p>
            <p>
              预估修边损耗:{' '}
              {selectedPlan.lossBreakdown.trimLossAreaM2.toFixed(3)} m2
            </p>
            <p>{selectedPlan.lossBreakdown.message}</p>
          </div>
        ) : null
      }
      previewContent={
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>当前损耗仍基于本地 preview 估算。</p>
          <p>正式候选生成后，这里会切换为后端方案级损耗解释。</p>
        </div>
      }
    />
  )
}

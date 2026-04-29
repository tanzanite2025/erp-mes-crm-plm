import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewRollSummaryCardProps = {
  displayState: BatchEnginePreviewDisplayState
  relatedRollIds: string[]
  filteredRollIds: string[]
}

export function BatchEnginePreviewRollSummaryCard(props: BatchEnginePreviewRollSummaryCardProps) {
  const { displayState, relatedRollIds, filteredRollIds } = props
  const { selectedPlan } = displayState

  return (
    <BatchEnginePreviewStateCard
      title='卷材布局摘要'
      mode={displayState.mode}
      solvedContent={selectedPlan ? (
        <div className='mt-3 grid gap-2'>
          {selectedPlan.layoutSummary.rolls.map((roll) => (
            <div
              key={roll.rollId}
              className={relatedRollIds.includes(roll.rollId)
                ? 'rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-700'
                : filteredRollIds.includes(roll.rollId)
                  ? 'rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700'
                  : 'rounded-2xl border border-dashed border-slate-200 bg-slate-100/60 px-3 py-2 text-xs font-semibold text-slate-400'}
            >
              <p>{roll.rollId}</p>
              <p>利用率: {roll.utilizationPercent.toFixed(2)}%</p>
              <p>分配套数: {roll.allocatedSets}</p>
              <p>分配块数: {roll.allocatedPieces}</p>
              <p>剩余面积: {roll.unusedAreaM2.toFixed(3)} m2</p>
              {relatedRollIds.includes(roll.rollId) ? <p>当前需求相关卷材</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      previewContent={(
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>本地 preview 不包含正式候选的卷材聚合摘要。</p>
        </div>
      )}
    />
  )
}

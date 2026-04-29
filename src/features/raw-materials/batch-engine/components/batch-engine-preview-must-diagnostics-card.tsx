import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewMustDiagnosticsCardProps = {
  displayState: BatchEnginePreviewDisplayState
}

export function BatchEnginePreviewMustDiagnosticsCard(props: BatchEnginePreviewMustDiagnosticsCardProps) {
  const { displayState } = props
  const { selectedPlan } = displayState

  return (
    <BatchEnginePreviewStateCard
      title='Must 诊断'
      mode={displayState.mode}
      solvedContent={selectedPlan ? (
        selectedPlan.mustFulfillDiagnostics.length ? (
          <div className='mt-3 grid gap-2'>
            {selectedPlan.mustFulfillDiagnostics.map((item) => (
              <div
                key={`${item.demandLineId}-${item.reasonCode}`}
                className={item.status === 'unfulfilled'
                  ? 'rounded-2xl border border-rose-200 bg-rose-500/10 px-3 py-3 text-xs font-semibold text-rose-700'
                  : 'rounded-2xl border border-emerald-200 bg-emerald-500/10 px-3 py-3 text-xs font-semibold text-emerald-700'}
              >
                <p>{item.demandLineId} / {item.reasonCode}</p>
                <p className='mt-1'>{item.message}</p>
                <p className='mt-1'>约束: {item.blockingConstraint}</p>
                <p className='mt-1'>建议: {item.suggestion}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
            <p>当前方案没有 mustFulfill 诊断信息。</p>
          </div>
        )
      ) : null}
      previewContent={(
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>本地 preview 不包含正式候选的 mustFulfill 诊断。</p>
        </div>
      )}
    />
  )
}

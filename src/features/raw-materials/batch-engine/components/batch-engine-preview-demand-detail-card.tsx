import type { BatchOptimizerPlanLayoutDemandSummary } from '../types'

type BatchEnginePreviewDemandDetailCardProps = {
  explicitSelectedDemandLineId: string
  explicitSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  effectiveSelectedDemandLineId: string
  effectiveSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
}

export function BatchEnginePreviewDemandDetailCard(
  props: BatchEnginePreviewDemandDetailCardProps
) {
  const {
    explicitSelectedDemandLineId,
    explicitSelectedDemand,
    effectiveSelectedDemandLineId,
    effectiveSelectedDemand,
  } = props
  const hasExplicitSelection = Boolean(explicitSelectedDemandLineId)
  const showingFallbackFocus =
    !hasExplicitSelection && Boolean(effectiveSelectedDemand)
  const showingDifferentEffectiveFocus = Boolean(
    hasExplicitSelection &&
    explicitSelectedDemandLineId &&
    effectiveSelectedDemandLineId &&
    explicitSelectedDemandLineId !== effectiveSelectedDemandLineId
  )

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black tracking-[0.2em] text-slate-500/75 uppercase'>
        当前需求行
      </p>
      {effectiveSelectedDemand ? (
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          {showingFallbackFocus ? (
            <div className='rounded-2xl border border-amber-200 bg-amber-500/10 px-3 py-2 text-[10px] font-black tracking-[0.18em] text-amber-700 uppercase'>
              当前未显式选择需求行，下面展示的是筛选结果中的默认焦点。
            </div>
          ) : null}
          {showingDifferentEffectiveFocus ? (
            <div className='rounded-2xl border border-cyan-200 bg-cyan-500/10 px-3 py-2 text-[10px] font-black tracking-[0.18em] text-cyan-700 uppercase'>
              已显式选择 {explicitSelectedDemandLineId}，但当前筛选仅命中{' '}
              {effectiveSelectedDemandLineId}，以下为当前焦点详情。
            </div>
          ) : null}
          {hasExplicitSelection &&
          explicitSelectedDemand &&
          !showingDifferentEffectiveFocus ? (
            <div className='rounded-2xl border border-emerald-200 bg-emerald-500/10 px-3 py-2 text-[10px] font-black tracking-[0.18em] text-emerald-700 uppercase'>
              当前展示的是你显式选择的需求行。
            </div>
          ) : null}
          <p>ID: {effectiveSelectedDemand.demandLineId}</p>
          <p>覆盖率: {effectiveSelectedDemand.coveragePercent.toFixed(2)}%</p>
          <p>需求套数: {effectiveSelectedDemand.requiredSets}</p>
          <p>已分配套数: {effectiveSelectedDemand.allocatedSets}</p>
          <p>剩余套数: {effectiveSelectedDemand.remainingSets}</p>
          <p>
            跨卷分配: {effectiveSelectedDemand.isSplitAcrossRolls ? '是' : '否'}
          </p>
        </div>
      ) : (
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>当前未选中需求行。</p>
          <p>可从摘要区选择需求行，或直接点击正式方案画布中的区域。</p>
        </div>
      )}
    </div>
  )
}

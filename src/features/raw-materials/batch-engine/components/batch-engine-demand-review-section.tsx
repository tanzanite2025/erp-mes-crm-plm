import type { BatchOptimizerPlanLayoutDemandSummary } from '../types'

type BatchEngineDemandReviewSectionProps = {
  demandSearchQuery: string
  onDemandSearchQueryChange: (value: string) => void
  demandFilterMode: 'all' | 'unfulfilled' | 'split' | 'must-fulfill' | 'diff'
  onDemandFilterModeChange: (mode: 'all' | 'unfulfilled' | 'split' | 'must-fulfill' | 'diff') => void
  rollFilterMode: 'all-rolls' | 'used-rolls' | 'related-rolls'
  onRollFilterModeChange: (mode: 'all-rolls' | 'used-rolls' | 'related-rolls') => void
  demandGroupMode: 'status' | 'must-fulfill' | 'usage-type'
  onDemandGroupModeChange: (mode: 'status' | 'must-fulfill' | 'usage-type') => void
  filteredDemandLines: BatchOptimizerPlanLayoutDemandSummary[]
  groupedDemandLines: Array<{ groupKey: string; items: BatchOptimizerPlanLayoutDemandSummary[] }>
  selectedDemandLineId: string
  selectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  onSelectDemandLine: (demandLineId: string) => void
}

export function BatchEngineDemandReviewSection(props: BatchEngineDemandReviewSectionProps) {
  const {
    demandSearchQuery,
    onDemandSearchQueryChange,
    demandFilterMode,
    onDemandFilterModeChange,
    rollFilterMode,
    onRollFilterModeChange,
    demandGroupMode,
    onDemandGroupModeChange,
    filteredDemandLines,
    groupedDemandLines,
    selectedDemandLineId,
    selectedDemand,
    onSelectDemandLine,
  } = props

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>需求行审阅</p>

      <input
        value={demandSearchQuery}
        onChange={(event) => onDemandSearchQueryChange(event.target.value)}
        placeholder='搜索需求行 ID'
        className='mt-3 h-12 w-full rounded-2xl border-none bg-slate-100 px-4 text-xs font-semibold text-slate-800 outline-none'
      />

      <div className='mt-3 flex flex-wrap gap-2'>
        {([
          ['all', '全部'],
          ['unfulfilled', '未满足'],
          ['split', '跨卷'],
          ['must-fulfill', 'Must'],
          ['diff', '差异'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type='button'
            onClick={() => onDemandFilterModeChange(mode)}
            className={demandFilterMode === mode
              ? 'h-9 rounded-full border border-cyan-300 bg-cyan-50 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700'
              : 'h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='mt-3 flex flex-wrap gap-2'>
        {([
          ['all-rolls', '全部卷材'],
          ['used-rolls', '已用卷材'],
          ['related-rolls', '相关卷材'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type='button'
            onClick={() => onRollFilterModeChange(mode)}
            className={rollFilterMode === mode
              ? 'h-9 rounded-full border border-amber-300 bg-amber-50 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700'
              : 'h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='mt-3 flex flex-wrap gap-2'>
        {([
          ['status', '状态分组'],
          ['must-fulfill', 'Must 分组'],
          ['usage-type', '用途分组'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type='button'
            onClick={() => onDemandGroupModeChange(mode)}
            className={demandGroupMode === mode
              ? 'h-9 rounded-full border border-slate-900 bg-slate-900 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white'
              : 'h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='mt-3 grid gap-2'>
        {filteredDemandLines.length ? (
          groupedDemandLines.map((group) => (
            <div key={group.groupKey} className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-2'>
              <p className='px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>{group.groupKey}</p>
              <div className='mt-2 grid gap-2'>
                {group.items.map((line) => {
                  const selected = line.demandLineId === selectedDemandLineId
                  return (
                    <button
                      key={line.demandLineId}
                      type='button'
                      onClick={() => onSelectDemandLine(line.demandLineId)}
                      className={selected
                        ? 'rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-left'
                        : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left'}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>
                          {line.demandLineId}
                        </p>
                        <span className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'>
                          {line.fulfilled ? '已满足' : '未满足'}
                        </span>
                      </div>
                      <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
                        <p>覆盖率: {line.coveragePercent.toFixed(2)}%</p>
                        <p>卷材数: {line.rollCount}</p>
                        <p>跨卷: {line.isSplitAcrossRolls ? '是' : '否'}</p>
                        <p>用途: {line.usageType || '--'}</p>
                        <p>剩余套数: {line.remainingSets}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-xs font-semibold text-slate-600'>
            当前筛选条件下没有需求行。
          </div>
        )}
      </div>

      {selectedDemand ? (
        <div className='mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3'>
          <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>当前需求详情</p>
          <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
            <p>ID: {selectedDemand.demandLineId}</p>
            <p>需求套数: {selectedDemand.requiredSets}</p>
            <p>已分配套数: {selectedDemand.allocatedSets}</p>
            <p>剩余套数: {selectedDemand.remainingSets}</p>
            <p>卷材列表: {selectedDemand.rollIds.join(', ') || '--'}</p>
            <p>Zone 数: {selectedDemand.zoneIds.length}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

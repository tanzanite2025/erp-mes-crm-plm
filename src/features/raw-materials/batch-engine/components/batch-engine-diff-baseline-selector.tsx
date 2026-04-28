import type { BatchOptimizerPlan } from '../types'

type BatchEngineDiffBaselineSelectorProps = {
  plans: BatchOptimizerPlan[]
  baselinePlanRank: number | null
  onChangeBaselinePlan: (rank: number) => void
}

export function BatchEngineDiffBaselineSelector(props: BatchEngineDiffBaselineSelectorProps) {
  const { plans, baselinePlanRank, onChangeBaselinePlan } = props

  if (plans.length <= 1) {
    return null
  }

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-500/75'>差异基准</p>
      <p className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400'>baseline selector</p>
      <div className='mt-3 flex flex-wrap gap-2'>
        {plans.map((plan) => {
          const selected = plan.rank === baselinePlanRank
          return (
            <button
              key={plan.rank}
              type='button'
              onClick={() => onChangeBaselinePlan(plan.rank)}
              className={selected
                ? 'h-10 rounded-full border border-rose-300 bg-rose-500/10 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-700'
                : 'h-10 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'}
            >
              Top{plan.rank}
            </button>
          )
        })}
      </div>
    </div>
  )
}

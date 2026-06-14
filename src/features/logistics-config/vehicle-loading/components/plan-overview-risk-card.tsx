type Props = {
  riskText: string
  detail: string
}

export function PlanOverviewRiskCard({ riskText, detail }: Props) {
  return (
    <div className='col-span-2 rounded-[20px] border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3'>
      <div className='text-[10px] font-black tracking-widest text-amber-700 uppercase'>
        风险提示
      </div>
      <div className='mt-2 text-sm font-black text-amber-900'>{riskText}</div>
      <div className='mt-1 text-[11px] leading-relaxed text-amber-700'>
        {detail}
      </div>
    </div>
  )
}

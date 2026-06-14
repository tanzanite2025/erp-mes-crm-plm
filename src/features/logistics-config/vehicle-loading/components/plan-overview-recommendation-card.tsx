type Props = {
  title: string
  vehicleName: string
  detail: string
  emptyText: string
}

export function PlanOverviewRecommendationCard({
  title,
  vehicleName,
  detail,
  emptyText,
}: Props) {
  return (
    <div className='col-span-2 rounded-[24px] border border-dashed border-primary/25 bg-primary/6 px-5 py-4 shadow-sm shadow-primary/5'>
      <div className='text-[10px] font-black tracking-widest text-primary/65 uppercase'>
        {title}
      </div>
      <div className='mt-2 text-base font-black text-foreground'>
        {vehicleName || emptyText}
      </div>
      <div className='mt-1 text-[11px] leading-relaxed text-primary/80'>
        {detail}
      </div>
    </div>
  )
}

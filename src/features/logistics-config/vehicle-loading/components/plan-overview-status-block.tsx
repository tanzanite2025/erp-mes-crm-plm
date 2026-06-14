type Props = {
  title: string
  status: string
  description: string
}

export function PlanOverviewStatusBlock({ title, status, description }: Props) {
  return (
    <div className='col-span-2 rounded-[20px] border border-dashed border-border/55 bg-muted/[0.03] px-4 py-3'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        {title}
      </div>
      <div className='mt-2 text-sm font-black'>{status}</div>
      <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
        {description}
      </div>
    </div>
  )
}

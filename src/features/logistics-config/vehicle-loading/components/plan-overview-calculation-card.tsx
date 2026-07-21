import { Badge } from '@/components/ui/badge'

type Props = {
  title: string
  statusLabel: string
  description: string
}

export function PlanOverviewCalculationCard({
  title,
  statusLabel,
  description,
}: Props) {
  return (
    <div className='col-span-2 rounded-[20px] border border-dashed border-border/55 bg-muted/[0.03] px-4 py-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
          {title}
        </div>
        <Badge className='border-none bg-primary/10 text-primary'>
          {statusLabel}
        </Badge>
      </div>
      <div className='mt-2 text-sm font-black'>后端装载建议</div>
      <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
        {description}
      </div>
    </div>
  )
}

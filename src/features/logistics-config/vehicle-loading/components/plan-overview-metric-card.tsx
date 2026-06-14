import { Card } from '@/components/ui/card'

type Props = {
  label: string
  value: string | number
}

export function PlanOverviewMetricCard({ label, value }: Props) {
  return (
    <Card className='rounded-[20px] border border-dashed border-border/55 bg-muted/[0.03] px-4 py-3 shadow-none'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        {label}
      </div>
      <div className='mt-2 text-base font-black'>{value}</div>
    </Card>
  )
}

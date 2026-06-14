import { TimerReset } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'
import { getApsCapacityMetrics } from '../utils/aps-capacity-metrics'

type ApsKpiCardsProps = {
  source: ApsSchedulingSource
}

function formatHours(hours: number): string {
  return `${Math.round(hours * 10) / 10}h`
}

export function ApsKpiCards({ source }: ApsKpiCardsProps) {
  const { t } = useLanguage()
  const pendingJobs = source.stageCards[0]?.jobs.length ?? 0
  const riskJobs = source.stageCards[2]?.jobs.length ?? 0
  const { capacityRate, occupiedHours, availableHours, timeWindowHours } =
    getApsCapacityMetrics(source)

  const kpis = [
    {
      label: t('apsScheduling.board.pending'),
      value: String(pendingJobs),
      note: source.stageCards[0]?.note ?? '',
      tone: 'text-cyan-600',
    },
    {
      label: t('apsScheduling.board.capacity'),
      value: `${capacityRate}%`,
      note: t('apsScheduling.board.capacityNote', {
        occupiedHours: formatHours(occupiedHours),
        availableHours: formatHours(availableHours),
        timeWindowHours: formatHours(timeWindowHours),
      }),
      tone: 'text-amber-500',
    },
    {
      label: t('apsScheduling.board.risk'),
      value: String(riskJobs),
      note: source.stageCards[2]?.note ?? '',
      tone: 'text-rose-600',
    },
  ]

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      {kpis.map((item) => (
        <Card
          key={item.label}
          className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'
        >
          <CardContent className='flex flex-col gap-2 p-4 md:p-5'>
            <p className='text-[10px] font-black tracking-[0.28em] text-muted-foreground/50 uppercase'>
              {item.label}
            </p>
            <div className='flex items-end justify-between'>
              <span
                className={cn(
                  'text-2xl font-black tracking-tighter italic md:text-[28px]',
                  item.tone
                )}
              >
                {item.value}
              </span>
              <TimerReset className='size-4.5 text-muted-foreground/30' />
            </div>
            <p className='text-[9px] leading-4 font-black tracking-widest text-muted-foreground/40 uppercase'>
              {item.note}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

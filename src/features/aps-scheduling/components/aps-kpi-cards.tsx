import { TimerReset } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'
import { useLanguage } from '@/context/language-provider'

type ApsKpiCardsProps = {
  source: ApsSchedulingSource
}

export function ApsKpiCards({ source }: ApsKpiCardsProps) {
  const { t } = useLanguage()
  const kpis = [
    {
      label: t('apsScheduling.board.pending'),
      value: String(source.stageCards[0]?.jobs.length ?? 0),
      note: source.stageCards[0]?.note ?? '',
      tone: 'text-cyan-600',
    },
    {
      label: t('apsScheduling.board.capacity'),
      value: `${Math.min(95, source.lanes.length * 18 + 24)}%`,
      note: source.stageCards[1]?.note ?? '',
      tone: 'text-amber-500',
    },
    {
      label: t('apsScheduling.board.risk'),
      value: String(source.stageCards[2]?.jobs.length ?? 0),
      note: source.stageCards[2]?.note ?? '',
      tone: 'text-rose-600',
    },
  ]

  return (
    <div className='grid gap-4 md:grid-cols-3'>
      {kpis.map((item) => (
        <Card key={item.label} className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
          <CardContent className='flex flex-col gap-3 p-6'>
            <p className='text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground/50'>{item.label}</p>
            <div className='flex items-end justify-between'>
              <span className={cn('text-3xl font-black italic tracking-tighter', item.tone)}>{item.value}</span>
              <TimerReset className='size-5 text-muted-foreground/30' />
            </div>
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

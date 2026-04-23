import { TimerReset } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import type { ApsJob, ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

type ApsKpiCardsProps = {
  source: ApsSchedulingSource
}

function parseTime(value: string): number | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function estimateJobDurationHours(job: ApsJob): number {
  const start = parseTime(job.startAt)
  const due = parseTime(job.dueAt)
  if (start !== null && due !== null) {
    return Math.max((due - start) / (1000 * 60 * 60), 0.5)
  }

  switch (job.status) {
    case 'running':
      return 6
    case 'late':
      return 8
    case 'done':
      return 4
    default:
      return 2
  }
}

function formatHours(hours: number): string {
  return `${Math.round(hours * 10) / 10}h`
}

function getWindowHours(jobs: ApsJob[]): number {
  const timestamps = jobs
    .flatMap((job) => [parseTime(job.startAt), parseTime(job.dueAt)])
    .filter((item): item is number => item !== null)

  if (timestamps.length < 2) {
    return Math.max(jobs.length * 4, 8)
  }

  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)
  return Math.max((maxTime - minTime) / (1000 * 60 * 60), 8)
}

export function ApsKpiCards({ source }: ApsKpiCardsProps) {
  const { t } = useLanguage()
  const pendingJobs = source.stageCards[0]?.jobs.length ?? 0
  const runningJobs = source.stageCards[1]?.jobs.length ?? 0
  const riskJobs = source.stageCards[2]?.jobs.length ?? 0
  const totalJobs = source.jobs.length
  const lineCount = Math.max(source.lanes.length, 1)
  const shiftHours = 8
  const availableHours = lineCount * shiftHours
  const occupiedHours = source.jobs.reduce((sum, job) => sum + estimateJobDurationHours(job), 0)
  const timeWindowHours = getWindowHours(source.jobs)
  const linePressure = Math.min(1, occupiedHours / availableHours)
  const windowPressure = Math.min(1, occupiedHours / timeWindowHours)
  const stagePressure = totalJobs > 0 ? (runningJobs + riskJobs * 0.5) / totalJobs : 0
  const capacityRate =
    totalJobs > 0
      ? Math.min(
          95,
          Math.round((linePressure * 0.45 + windowPressure * 0.35 + stagePressure * 0.2) * 100),
        )
      : 0

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
    <div className='grid gap-4 md:grid-cols-3'>
      {kpis.map((item) => (
        <Card
          key={item.label}
          className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'
        >
          <CardContent className='flex flex-col gap-3 p-6'>
            <p className='text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground/50'>
              {item.label}
            </p>
            <div className='flex items-end justify-between'>
              <span className={cn('text-3xl font-black italic tracking-tighter', item.tone)}>
                {item.value}
              </span>
              <TimerReset className='size-5 text-muted-foreground/30' />
            </div>
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {item.note}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

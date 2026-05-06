import { ArrowRight, AlertTriangle, CircleAlert, Gauge, TriangleAlert, Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ApsJob } from '../types'

type OverdueLevel = 'minor' | 'major' | 'critical'

const statusLabelMap: Record<ApsJob['status'], string> = {
  draft: '待排产',
  running: '执行中',
  late: '延期',
  done: '完成',
}

const overdueLevelMeta: Record<OverdueLevel, { label: string; className: string; chipClassName: string; Icon: React.ElementType }> = {
  minor: {
    label: '轻度超限',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/15',
    chipClassName: 'bg-amber-500 text-white',
    Icon: CircleAlert,
  },
  major: {
    label: '严重超限',
    className: 'border-orange-500/25 bg-orange-500/10 text-orange-800 ring-1 ring-orange-500/15',
    chipClassName: 'bg-orange-500 text-white',
    Icon: TriangleAlert,
  },
  critical: {
    label: '紧急超限',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-800 ring-1 ring-rose-500/20',
    chipClassName: 'bg-rose-600 text-white',
    Icon: AlertTriangle,
  },
}

interface ApsTimelineLaneProps {
  line: string
  jobs: ApsJob[]
}

function getOverdueLevel(job: ApsJob): OverdueLevel {
  const [hourText] = job.dueAt.split(':')
  const dueHour = Number(hourText)

  if (Number.isNaN(dueHour) || dueHour <= 15) return 'critical'
  if (dueHour <= 18) return 'major'
  return 'minor'
}

function isOverdue(job: ApsJob) {
  return job.status === 'late'
}

export function ApsTimelineLane({ line, jobs }: ApsTimelineLaneProps) {
  const loadPercent = Math.min(jobs.length * 24 + 12, 100)
  const hasConflict = loadPercent >= 85 || jobs.some((job) => job.status === 'late')

  return (
    <div className='grid grid-cols-[140px_1fr] min-h-24'>
      <div className={cn('px-4 py-3 flex flex-col justify-between border-r border-dashed bg-background/70 gap-3', hasConflict ? 'border-rose-400/40' : 'border-muted/40')}>
        <div className='flex flex-col gap-2'>
          <span className={cn('text-sm font-black tracking-tight', hasConflict && 'text-rose-700')}>{line}</span>
          <span className='text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>LINE_CAPACITY</span>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
            <span>负载</span>
            <span className={cn(hasConflict && 'text-rose-600')}>{loadPercent}%</span>
          </div>
          <div className='h-2 rounded-full bg-muted/40 overflow-hidden border border-dashed border-muted/30'>
            <div
              className={cn(
                'h-full rounded-full bg-linear-to-r',
                hasConflict ? 'from-rose-500 via-orange-500 to-amber-400' : 'from-cyan-500 via-cyan-400 to-emerald-400',
              )}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
          <div className='flex items-center justify-between'>
            <Badge variant='outline' className={cn('w-fit rounded-full px-2 text-[9px] font-black uppercase tracking-[0.24em]', hasConflict && 'border-rose-500/30 text-rose-700 bg-rose-500/5')}>
              {jobs.length} jobs
            </Badge>
            <div className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em]', hasConflict ? 'text-rose-700/70' : 'text-cyan-700/60')}>
              {hasConflict ? <AlertTriangle className='size-3' /> : <Gauge className='size-3' />}
              {hasConflict ? 'CONFLICT' : 'ACTIVE'}
            </div>
          </div>
        </div>
      </div>

      <div className={cn('relative grid grid-cols-6 bg-linear-to-r', hasConflict ? 'from-rose-500/5 via-orange-500/5 to-transparent' : 'from-transparent via-cyan-500/5 to-transparent')}>
        {Array.from({ length: 6 }).map((_, slotIndex) => (
          <div key={slotIndex} className='border-l border-dashed border-muted/30 min-h-24 p-2 relative'>
            <div className='absolute top-2 right-2 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/20'>
              T{slotIndex + 1}
            </div>
          </div>
        ))}

        {jobs.map((job, jobIndex) => {
          const startSlot = Math.min(jobIndex * 2 + (job.status === 'running' ? 1 : 0), 5)
          const width = job.status === 'late' ? 2 : 1
          const tone =
            job.status === 'running'
              ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-700'
              : job.status === 'late'
                ? cn('border-rose-500/25 bg-rose-500/10 text-rose-700 ring-1', overdueLevelMeta[getOverdueLevel(job)].className)
                : job.status === 'done'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
                  : 'border-muted/40 bg-background text-foreground'

          return (
            <div
              key={job.id}
              className={cn('absolute top-2 bottom-2 rounded-[18px] border border-dashed px-3 py-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-0.5 hover:shadow-md overflow-hidden', tone)}
              style={{ left: `calc(${startSlot} * (100% / 6) + 8px)`, width: `calc(${width} * (100% / 6) - 16px)` }}
            >
              {isOverdue(job) ? (
                <div className={cn('absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-xl px-2 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-white shadow-lg', overdueLevelMeta[getOverdueLevel(job)].chipClassName)}>
                  {(() => {
                    const level = overdueLevelMeta[getOverdueLevel(job)]
                    const Icon = level.Icon
                    return (
                      <>
                        <Icon className='size-3' />
                        <span>{level.label}</span>
                      </>
                    )
                  })()}
                </div>
              ) : null}
              <div className='flex h-full flex-col justify-between gap-1.5'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Workflow className='size-4 shrink-0 text-current/70' />
                    <span className='text-sm font-black tracking-tight truncate'>{job.id}</span>
                  </div>
                  <Badge variant='outline' className='h-5 rounded-full px-2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap'>
                    {statusLabelMap[job.status]}
                  </Badge>
                </div>
                <div className='flex flex-col gap-1'>
                  <p className='text-[10px] uppercase tracking-[0.2em] font-black opacity-80 truncate'>{job.productName}</p>
                  <p className='text-[9px] uppercase tracking-[0.24em] font-black opacity-60'>{job.lineName}</p>
                  <div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] opacity-70'>
                    <span>{job.startAt}</span>
                    <ArrowRight className='size-3' />
                    <span>{job.dueAt}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

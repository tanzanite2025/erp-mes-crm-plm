import { Layers3, TimerReset } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

type ApsHeaderCardProps = {
  source: ApsSchedulingSource
}

function formatSummary(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

export function ApsHeaderCard({ source }: ApsHeaderCardProps) {
  const { t } = useLanguage()
  const activeJobs = source.jobs.filter((job) => job.status === 'running').length
  const draftJobs = source.jobs.filter((job) => job.status === 'draft').length
  const lateJobs = source.jobs.filter((job) => job.status === 'late').length

  return (
    <div className='relative overflow-hidden rounded-[32px] border border-dashed border-cyan-500/15 bg-muted/5 p-8'>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent' />
      <div className='relative flex flex-col gap-2'>
        <div className='flex items-center gap-2 text-cyan-600'>
          <Layers3 className='size-5' />
          <h3 className='text-lg font-black italic tracking-tighter uppercase'>{t('apsScheduling.board.title')}</h3>
        </div>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {formatSummary(t('apsScheduling.board.statusSummary'), {
              total: source.total,
              running: activeJobs,
              draft: draftJobs,
              late: lateJobs,
            })}
          </p>
          <div className='flex items-center gap-4 rounded-full border border-cyan-500/10 bg-cyan-500/5 px-4 py-1'>
            <TimerReset className='size-3.5 text-cyan-600' />
            <span className='text-[10px] font-black uppercase tracking-widest italic text-cyan-600/60'>
              {t('apsScheduling.board.fallbackNotice')}
            </span>
            <div className='size-1.5 rounded-full bg-cyan-500 animate-pulse' />
          </div>
        </div>
      </div>
    </div>
  )
}

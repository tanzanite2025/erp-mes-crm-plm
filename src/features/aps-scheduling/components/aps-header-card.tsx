import { Layers3, TimerReset } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

type ApsHeaderCardProps = {
  source: ApsSchedulingSource
  isFallback: boolean
}

export function ApsHeaderCard({ source, isFallback }: ApsHeaderCardProps) {
  const { t } = useLanguage()
  const activeJobs = source.jobs.filter(
    (job) => job.status === 'running'
  ).length
  const draftJobs = source.jobs.filter((job) => job.status === 'draft').length
  const lateJobs = source.jobs.filter((job) => job.status === 'late').length

  return (
    <IndustrialHeader
      icon={Layers3}
      title={t('apsScheduling.board.title')}
      description={t('apsScheduling.board.subtitle')}
      gradient
      className='gap-1.5 p-4 md:p-5'
      statusBadge={
        <div className='flex max-w-xs flex-col items-end gap-1.5'>
          <p className='text-right text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('apsScheduling.board.statusSummary', {
              total: source.total,
              running: activeJobs,
              draft: draftJobs,
              late: lateJobs,
            })}
          </p>
          {isFallback ? (
            <div className='flex items-center gap-2 rounded-full border border-cyan-500/10 bg-cyan-500/5 px-2.5 py-1'>
              <TimerReset className='size-3.5 text-cyan-600' />
              <span className='text-[10px] font-black tracking-widest text-cyan-700/70 uppercase'>
                {t('apsScheduling.board.fallbackNotice')}
              </span>
              <div className='size-1.5 animate-pulse rounded-full bg-cyan-500' />
            </div>
          ) : null}
        </div>
      }
    />
  )
}

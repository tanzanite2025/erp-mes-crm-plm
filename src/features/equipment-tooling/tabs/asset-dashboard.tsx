'use client'

import {
  BarChart3,
  Activity,
  ShieldCheck,
  Zap,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { DetailSections } from '../components/dashboard/detail-sections'
import { StatGroup } from '../components/dashboard/stat-cards'
import { useAssetDashboard } from '../hooks/use-asset-dashboard'

export function AssetDashboard() {
  const { t } = useLanguage()
  const { data: stats, isLoading, isError, refresh } = useAssetDashboard()

  const getActivityStatusLabel = (
    status: 'ACTIVE' | 'RETURNED' | 'OVERDUE'
  ) => {
    if (status === 'RETURNED') {
      return t('equipmentTooling.loans.status.returned')
    }
    if (status === 'OVERDUE') {
      return t('equipmentTooling.loans.status.overdue')
    }
    return t('equipmentTooling.loans.status.lent')
  }

  if (isLoading && !stats) {
    return (
      <div className='flex animate-pulse flex-col gap-8'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='grid grid-cols-6 gap-4'>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className='h-24 rounded-2xl bg-muted/10' />
          ))}
        </div>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
          <div className='h-[400px] rounded-[32px] bg-muted/5' />
          <div className='h-[400px] rounded-[32px] bg-muted/5' />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center gap-6 rounded-[40px] border-2 border-dashed border-rose-500/20 bg-rose-500/5 duration-500 fade-in'>
        <div className='flex size-16 items-center justify-center rounded-full bg-rose-500/10'>
          <AlertCircle className='size-8 animate-pulse text-rose-500' />
        </div>
        <div className='space-y-2 text-center'>
          <h3 className='text-sm font-black tracking-widest text-rose-600 uppercase italic'>
            {t('equipmentTooling.dashboard.error.title')}
          </h3>
          <p className='text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('equipmentTooling.dashboard.error.description')}
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => void refresh()}
          className='h-10 rounded-full border-rose-500/30 px-8 text-[10px] font-bold text-rose-600 uppercase transition-all hover:bg-rose-500 hover:text-white'
        >
          <RotateCcw className='mr-2 size-3' />{' '}
          {t('equipmentTooling.dashboard.error.retry')}
        </Button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={BarChart3}
        title={t('equipmentTooling.dashboard.header.title')}
        gradient
        statusBadge={
          <div className='flex items-center gap-3'>
            <div className='inline-flex h-5 items-center justify-center rounded-full border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 font-mono text-[8px] tracking-[0.2em] whitespace-nowrap text-emerald-600 uppercase'>
              {t('equipmentTooling.dashboard.header.systemHealthLabel')}:{' '}
              {t('equipmentTooling.dashboard.header.stable')}
            </div>
            <div className='inline-flex h-5 items-center justify-center rounded-full border border-dashed border-cyan-500/20 bg-cyan-500/5 px-3 font-mono text-[8px] tracking-[0.2em] whitespace-nowrap text-cyan-600 uppercase'>
              {t('equipmentTooling.dashboard.header.activeSensorsLabel')}:{' '}
              {stats.moldStats.total + stats.furnaceStats.total}{' '}
              {t('equipmentTooling.dashboard.header.vectors')}
            </div>
          </div>
        }
      />

      <StatGroup moldStats={stats.moldStats} />

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
        <div className='space-y-8 lg:col-span-2'>
          <DetailSections
            moldStats={stats.moldStats}
            healthVectors={stats.healthVectors}
          />
        </div>

        <div className='relative flex h-full flex-col gap-5 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5'>
          <div className='mb-2 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Activity className='size-4 text-primary' />
              <h4 className='text-[11px] font-black tracking-widest uppercase italic'>
                {t('equipmentTooling.dashboard.activity.title')}
              </h4>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='size-1.5 animate-ping rounded-full bg-emerald-500' />
              <span className='text-[8px] font-black tracking-widest text-emerald-500'>
                {t('equipmentTooling.dashboard.activity.live')}
              </span>
            </div>
          </div>

          <div className='space-y-3.5'>
            {stats.recentActivities.length === 0 ? (
              <div className='flex h-32 flex-col items-center justify-center opacity-20'>
                <Zap className='mb-2 size-8' />
                <span className='text-[9px] font-black tracking-widest uppercase'>
                  {t('equipmentTooling.dashboard.activity.empty')}
                </span>
              </div>
            ) : (
              stats.recentActivities.map((log, index) => (
                <div
                  key={`${log.moldSn}-${log.loanDate}-${index}`}
                  className='group/item relative border-l border-muted-foreground/10 py-0.5 pl-6'
                >
                  <div className='absolute top-1.5 left-[-4px] size-2 rounded-full bg-primary/30 transition-colors group-hover/item:bg-primary' />
                  <div className='flex flex-col gap-0.5'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-black tracking-tighter text-foreground uppercase italic'>
                        {log.moldSn} / {log.toFactory}
                      </span>
                      <span className='font-mono text-[8px] font-bold opacity-30'>
                        {new Date(log.loanDate).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className='text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                      {t('equipmentTooling.dashboard.activity.item', {
                        contactPerson: log.contactPerson,
                        status: getActivityStatusLabel(log.status),
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className='mt-auto grid grid-cols-2 gap-4 border-t border-dashed border-muted/50 pt-4'>
            <div className='flex flex-col gap-1 rounded-2xl bg-emerald-500/5 p-3'>
              <ShieldCheck className='size-4 text-emerald-500 opacity-50' />
              <span className='text-[14px] leading-none font-black tracking-tighter italic'>
                {stats.healthVectors.avgLifeConsumpt.toFixed(1)}%
              </span>
              <span className='text-[8px] font-black tracking-widest uppercase opacity-40'>
                {t('equipmentTooling.dashboard.summary.avgLifespan')}
              </span>
            </div>
            <div className='flex flex-col gap-1 rounded-2xl bg-rose-500/5 p-3'>
              <AlertCircle
                className={cn(
                  'size-4 text-rose-500 opacity-50',
                  stats.healthVectors.alertCount > 0 && 'animate-pulse'
                )}
              />
              <span className='text-[14px] leading-none font-black tracking-tighter italic'>
                {stats.healthVectors.alertCount}
              </span>
              <span className='text-[8px] font-black tracking-widest uppercase opacity-40'>
                {t('equipmentTooling.dashboard.summary.criticalAlerts')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

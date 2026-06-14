'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Package, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { CalendarView } from './components/calendar-view'
import { DayDetailSheet } from './components/day-detail-sheet'
import {
  ProductionCalendarService,
  type MonthlyStats,
} from './services/production-calendar-service'

export default function ProductionCalendar() {
  const { t } = useLanguage()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalOutput: 0,
    estimatedValue: '--',
  })

  // 当用户点击日历上的某天
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // 窄屏下依然可以用 drawer，宽屏下我们直接在右侧常驻面板更新显示
    setIsDrawerOpen(true)
  }

  // 加载当月汇总和排产记录
  useEffect(() => {
    const loadStatsAndRecords = async () => {
      try {
        setStatsError(null)
        const stats = await ProductionCalendarService.getMonthlyStats(
          new Date()
        )
        setMonthlyStats(stats)
      } catch (_error) {
        setStatsError(t('dashboard.page.calendar.error.loadStats'))
      }
    }
    void loadStatsAndRecords()

    const handleSync = () => void loadStatsAndRecords()
    window.addEventListener('xdfc_production_plans_updated', handleSync)
    return () =>
      window.removeEventListener('xdfc_production_plans_updated', handleSync)
  }, [t])

  const retryLoadStats = async () => {
    try {
      setStatsError(null)
      const stats = await ProductionCalendarService.getMonthlyStats(new Date())
      setMonthlyStats(stats)
    } catch (_error) {
      setStatsError(t('dashboard.page.calendar.error.loadStats'))
    }
  }

  return (
    <div className='animate-in space-y-2.5 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-2.5 border-b border-dashed border-muted/50 pb-2.5 xl:flex-row xl:items-end'>
        <div className='min-w-0 flex-1'>
          <h1 className='flex items-center gap-2 truncate text-sm font-black tracking-tighter text-slate-800 uppercase italic'>
            <div className='size-2 shrink-0 animate-pulse rounded-full bg-blue-600' />
            {t('dashboard.page.calendar.title')}
          </h1>
          <p className='mt-0.5 flex items-center gap-2 text-[9px] leading-snug font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('dashboard.page.calendar.description')}
          </p>
        </div>

        {/* 顶部快速汇总 */}
        <div className='flex flex-col items-stretch gap-1 overflow-hidden rounded-[20px] border border-dashed border-muted/50 bg-muted/5 p-0.5 shadow-inner sm:flex-row sm:items-center'>
          <div className='border-b border-dashed border-muted/50 px-2.5 py-1 sm:border-r sm:border-b-0'>
            <div className='mb-0.5 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t('dashboard.page.calendar.stats.totalOutput')}
            </div>
            <div className='flex items-center gap-1.5 text-[11px] font-black text-blue-600 italic'>
              <Package className='size-3.5' />{' '}
              {monthlyStats.totalOutput.toLocaleString()}{' '}
              <span className='text-[8px] font-black text-muted-foreground/40 uppercase'>
                {t('dashboard.page.calendar.units.pcs')}
              </span>
            </div>
          </div>
          <div className='px-2.5 py-1'>
            <div className='mb-0.5 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t('dashboard.page.calendar.stats.estPerformance')}
            </div>
            <div className='flex items-center gap-1.5 text-[11px] font-black text-emerald-600 italic'>
              <TrendingUp className='size-3.5' />{' '}
              {monthlyStats.estimatedValue === 'SYNC_REALTIME'
                ? t('dashboard.page.calendar.stats.syncRealtime')
                : monthlyStats.estimatedValue}
            </div>
          </div>
        </div>
      </div>

      {statsError && (
        <div className='rounded-xl border border-dashed border-rose-200 bg-rose-50/70 px-3.5 py-3 text-rose-700'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <div>
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('dashboard.page.calendar.title')}
                </p>
                <p className='text-xs font-bold wrap-break-word'>
                  {statsError}
                </p>
              </div>
            </div>
            <Button
              variant='outline'
              className='h-8 rounded-full border-dashed text-xs'
              onClick={() => {
                void retryLoadStats()
              }}
            >
              {t('common.actions.retry')}
            </Button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className='relative overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-2 shadow-inner sm:p-2.5'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
        <div className='relative z-10'>
          <CalendarView onDateClick={handleDateClick} />
        </div>
      </div>

      {/* drawer component for mobile fallback */}
      <DayDetailSheet
        date={selectedDate}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { CalendarView } from './components/calendar-view'
import { DayDetailSheet } from './components/day-detail-sheet'
import { TrendingUp, Package, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProductionCalendarService, type MonthlyStats } from './services/production-calendar-service'
import { useLanguage } from '@/context/language-provider'

export default function ProductionCalendar() {
    const { t } = useLanguage()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [statsError, setStatsError] = useState<string | null>(null)
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
        totalOutput: 0,
        estimatedValue: '--'
    })

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
        setIsDrawerOpen(true)
    }

    // 加载当月数据汇总
    useEffect(() => {
        const loadStats = async () => {
            try {
                setStatsError(null)
                const stats = await ProductionCalendarService.getMonthlyStats(new Date())
                setMonthlyStats(stats)
            } catch (_error) {
                setStatsError(t('dashboard.page.calendar.error.loadStats'))
            }
        }
        void loadStats()
        
        // 监听计划更新事件以刷新汇总
        const handleSync = () => loadStats()
        window.addEventListener('xdfc_production_plans_updated', handleSync)
        return () => window.removeEventListener('xdfc_production_plans_updated', handleSync)
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
        <div className='space-y-4 p-3 md:space-y-5 md:p-4'>
            <div className='flex flex-col justify-between gap-3 border-b border-dashed border-muted/50 pb-4 xl:flex-row xl:items-end'>
                <div className='flex-1 min-w-0'>
                    <h1 className='text-lg font-black tracking-tighter italic text-slate-800 flex items-center gap-2 uppercase truncate'>
                        <div className='size-2.5 bg-blue-600 rounded-full animate-pulse shrink-0' />
                        {t('dashboard.page.calendar.title')}
                    </h1>
                    <p className='mt-1.5 flex items-center gap-2 text-[9px] font-black uppercase leading-snug tracking-widest text-muted-foreground/60 md:text-[10px]'>
                        {t('dashboard.page.calendar.description')}
                    </p>
                </div>

                {/* 顶部快速汇总 */}
                <div className='flex flex-col items-stretch gap-1.5 overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-0.5 shadow-inner sm:flex-row sm:items-center md:rounded-[20px]'>
                    <div className='border-b border-dashed border-muted/50 px-3 py-1.5 sm:border-b-0 sm:border-r md:px-4'>
                        <div className='mb-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 md:text-[9px]'>
                            {t('dashboard.page.calendar.stats.totalOutput')}
                        </div>
                        <div className='flex items-center gap-1.5 text-[13px] font-black italic text-blue-600 md:text-sm'>
                            <Package className='size-3.5' /> {monthlyStats.totalOutput.toLocaleString()} <span className='text-[9px] font-black uppercase text-muted-foreground/40'>{t('dashboard.page.calendar.units.pcs')}</span>
                        </div>
                    </div>
                    <div className='px-3 py-1.5 md:px-4'>
                        <div className='mb-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 md:text-[9px]'>
                            {t('dashboard.page.calendar.stats.estPerformance')}
                        </div>
                        <div className='flex items-center gap-1.5 text-[13px] font-black italic text-emerald-600 md:text-sm'>
                            <TrendingUp className='size-3.5' /> {monthlyStats.estimatedValue === 'SYNC_REALTIME' ? t('dashboard.page.calendar.stats.syncRealtime') : monthlyStats.estimatedValue}
                        </div>
                    </div>
                </div>
            </div>

            {statsError && (
                <div className='rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 px-3.5 py-3 text-rose-700'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-start gap-3'>
                            <AlertCircle className='mt-0.5 size-4 shrink-0' />
                            <div>
                                <p className='text-[10px] font-black uppercase tracking-widest'>{t('dashboard.page.calendar.title')}</p>
                                <p className='text-xs font-bold wrap-break-word'>{statsError}</p>
                            </div>
                        </div>
                        <Button variant='outline' className='rounded-full border-dashed' onClick={() => { void retryLoadStats() }}>
                            {t('common.actions.retry')}
                        </Button>
                    </div>
                </div>
            )}

            <Card className='relative overflow-hidden rounded-2xl border-dashed border-muted/20 bg-muted/5 shadow-inner md:rounded-[28px]'>
                <div className='absolute top-0 left-0 h-1 w-full bg-linear-to-r from-blue-600/20 via-transparent to-transparent' />
                <CardContent className='overflow-hidden p-3 md:p-4'>
                    <CalendarView onDateClick={handleDateClick} />
                </CardContent>
            </Card>

            <DayDetailSheet
                date={selectedDate}
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
            />
        </div>
    )
}

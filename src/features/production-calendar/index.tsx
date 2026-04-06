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
            } catch (error) {
                setStatsError(t('dashboard.page.calendar.error.loadStats'))
            }
        }
        void loadStats()
        
        // 监听计划更新事件以刷新汇总
        const handleSync = () => loadStats()
        window.addEventListener('xdfc_production_plans_updated', handleSync)
        return () => window.removeEventListener('xdfc_production_plans_updated', handleSync)
    }, [])

    const retryLoadStats = async () => {
        try {
            setStatsError(null)
            const stats = await ProductionCalendarService.getMonthlyStats(new Date())
            setMonthlyStats(stats)
        } catch (error) {
            setStatsError(t('dashboard.page.calendar.error.loadStats'))
        }
    }

    return (
        <div className='p-4 md:p-6 space-y-6'>
            <div className='flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-dashed border-muted/50 pb-6'>
                <div className='flex-1 min-w-0'>
                    <h1 className='text-lg font-black tracking-tighter italic text-slate-800 flex items-center gap-2 uppercase truncate'>
                        <div className='size-2.5 bg-blue-600 rounded-full animate-pulse shrink-0' />
                        {t('dashboard.page.calendar.title')}
                    </h1>
                    <p className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 flex items-center gap-2 leading-relaxed'>
                        {t('dashboard.page.calendar.description')}
                    </p>
                </div>

                {/* 顶部快速汇总 */}
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/5 p-1 rounded-2xl md:rounded-[24px] border border-dashed border-muted/50 shadow-inner overflow-hidden'>
                    <div className='px-4 md:px-6 py-2 border-b sm:border-b-0 sm:border-r border-dashed border-muted/50'>
                        <div className='text-[8px] md:text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1'>
                            {t('dashboard.page.calendar.stats.totalOutput')}
                        </div>
                        <div className='text-sm md:text-base font-black text-blue-600 italic flex items-center gap-2'>
                            <Package className='size-4' /> {monthlyStats.totalOutput.toLocaleString()} <span className='text-[10px] font-black text-muted-foreground/40 uppercase'>{t('dashboard.page.calendar.units.pcs')}</span>
                        </div>
                    </div>
                    <div className='px-4 md:px-6 py-2'>
                        <div className='text-[8px] md:text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1'>
                            {t('dashboard.page.calendar.stats.estPerformance')}
                        </div>
                        <div className='text-sm md:text-base font-black text-emerald-600 italic flex items-center gap-2'>
                            <TrendingUp className='size-4' /> {monthlyStats.estimatedValue === 'SYNC_REALTIME' ? t('dashboard.page.calendar.stats.syncRealtime') : monthlyStats.estimatedValue}
                        </div>
                    </div>
                </div>
            </div>

            {statsError && (
                <div className='rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 px-4 py-4 text-rose-700'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-start gap-3'>
                            <AlertCircle className='mt-0.5 size-4 shrink-0' />
                            <div>
                                <p className='text-[10px] font-black uppercase tracking-widest'>{t('dashboard.page.calendar.title')}</p>
                                <p className='text-xs font-bold break-words'>{statsError}</p>
                            </div>
                        </div>
                        <Button variant='outline' className='rounded-full border-dashed' onClick={() => { void retryLoadStats() }}>
                            {t('common.actions.retry')}
                        </Button>
                    </div>
                </div>
            )}

            <Card className='bg-muted/5 rounded-2xl md:rounded-[32px] border-dashed border-muted/20 shadow-inner overflow-hidden relative'>
                <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600/20 via-transparent to-transparent' />
                <CardContent className='p-4 md:p-8 overflow-hidden'>
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

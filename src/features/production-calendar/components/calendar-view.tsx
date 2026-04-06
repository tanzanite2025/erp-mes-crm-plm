import { useState, useEffect } from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    eachDayOfInterval
} from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProductionCalendarService, type DailyProductionRecord } from '../services/production-calendar-service'
import { useLanguage } from '@/context/language-provider'

interface CalendarViewProps {
    onDateClick: (date: Date) => void
}

export function CalendarView({ onDateClick }: CalendarViewProps) {
    const { t, locale } = useLanguage()
    const dateLocale = locale === 'zh-CN' ? zhCN : enUS
    
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [records, setRecords] = useState<DailyProductionRecord[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    const today = new Date()

    // 加载生产任务流水 (API 驱动)
    useEffect(() => {
        const loadRecords = async () => {
            try {
                setLoadError(null)
                const data = await ProductionCalendarService.getAllRecords()
                setRecords(data)
            } catch (error) {
                setLoadError(t('dashboard.page.calendar.error.loadCalendar'))
            }
        }
        void loadRecords()

        const handleSync = () => loadRecords()
        window.addEventListener('xdfc_production_plans_updated', handleSync)
        return () => window.removeEventListener('xdfc_production_plans_updated', handleSync)
    }, [])

    const renderHeader = () => {
        return (
            <div className='flex flex-col gap-1 bg-muted/5 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 mb-6 md:mb-8'>
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                    <div className='flex items-center gap-3 md:gap-4'>
                        <div className='size-9 md:size-11 rounded-xl md:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group transition-all shrink-0'>
                            <CalendarIcon className='size-4 md:size-5 group-hover:scale-110 transition-transform' />
                        </div>
                        <div className='flex flex-col gap-0.5 overflow-hidden'>
                            <h1 className='text-base md:text-lg font-black tracking-tighter italic uppercase text-primary truncate'>
                                {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                            </h1>
                            <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 truncate'>
                                {t('dashboard.page.calendar.view.timeline')}
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center gap-2 md:gap-3'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setCurrentMonth(today)}
                            className='h-8 md:h-9 flex-1 sm:flex-none rounded-full px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all'
                        >
                            {t('dashboard.page.calendar.view.today')}
                        </Button>
                        <div className='flex items-center bg-background border border-dashed border-muted/50 rounded-full p-0.5 shadow-sm'>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-7 md:size-8 rounded-full hover:bg-muted/10 transition-all'
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            >
                                <ChevronLeft className='size-4 text-muted-foreground' />
                            </Button>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-7 md:size-8 rounded-full hover:bg-muted/10 transition-all'
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            >
                                <ChevronRight className='size-4 text-muted-foreground' />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        const days = [
          t('dashboard.page.calendar.view.days.sun'),
          t('dashboard.page.calendar.view.days.mon'),
          t('dashboard.page.calendar.view.days.tue'),
          t('dashboard.page.calendar.view.days.wed'),
          t('dashboard.page.calendar.view.days.thu'),
          t('dashboard.page.calendar.view.days.fri'),
          t('dashboard.page.calendar.view.days.sat'),
        ]
        return (
            <div className='grid grid-cols-7 mb-4 px-2 min-w-[700px] md:min-w-0'>
                {days.map((day, i) => (
                    <div key={i} className='text-center text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] italic'>
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const calendarDates = eachDayOfInterval({
            start: startDate,
            end: endDate,
        })

        return (
            <div className='grid grid-cols-7 gap-1.5 p-1.5 bg-muted/10 border border-dashed border-muted/50 rounded-2xl md:rounded-[32px] shadow-inner min-w-[700px] md:min-w-0'>
                {calendarDates.map((day, i) => {
                    const isInMonth = isSameMonth(day, monthStart)
                    const isToday = isSameDay(day, today)

                    const dayRecord = records.find(r => isSameDay(r.date, day))
                    const hasOutput = dayRecord && dayRecord.output > 0

                    return (
                        <div
                            key={i}
                            className={cn(
                                'min-h-[100px] md:min-h-[120px] bg-background p-2 md:p-3 rounded-xl md:rounded-[24px] border border-transparent transition-all cursor-pointer relative group',
                                !isInMonth && 'bg-muted/5 opacity-30 pointer-events-none',
                                isInMonth && 'hover:border-primary/20 hover:shadow-lg hover:bg-white',
                                isToday && 'ring-2 ring-primary/20 bg-primary/[0.02]'
                            )}
                            onClick={() => onDateClick(day)}
                        >
                            <div className='flex justify-between items-start'>
                                <span className={cn(
                                    'text-sm font-black italic tracking-tighter tabular-nums size-8 flex items-center justify-center rounded-xl transition-colors',
                                    isToday ? 'bg-primary text-white shadow-lg' : 'text-slate-400'
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {hasOutput && (
                                    <Badge className='text-[8px] font-black italic py-0 h-4 rounded-md bg-emerald-500/10 text-emerald-600 border-none shadow-none'>
                                        {dayRecord.output} {t('dashboard.page.calendar.units.pcs')}
                                    </Badge>
                                )}
                            </div>

                            <div className='mt-3 space-y-1.5'>
                                {dayRecord?.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className='flex flex-col gap-0.5 group/item transition-all'>
                                        <div className='flex items-center gap-1.5'>
                                            <div className='size-1 rounded-full bg-blue-500 shrink-0' />
                                            <span className='text-[10px] font-bold text-secondary truncate uppercase tracking-tight'>{item.name}</span>
                                        </div>
                                        <div className='flex items-center gap-2 pl-2.5 opacity-40 text-[8px] font-mono'>
                                            <span>#{item.orderNo}</span>
                                        </div>
                                    </div>
                                ))}
                                {dayRecord && dayRecord.items.length > 2 && (
                                    <p className='text-[8px] font-black text-muted-foreground/30 italic uppercase tracking-widest pl-2.5 pt-1'>
                                        + {dayRecord.items.length - 2} {t('dashboard.page.calendar.view.moreNodes')}
                                    </p>
                                )}
                            </div>

                            {/* Task Hint */}
                            {hasOutput && (
                                <div className='absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0'>
                                    <Activity className='size-3 text-primary animate-pulse' />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <Card className='border-none shadow-none bg-transparent animate-in fade-in duration-700 overflow-hidden'>
            <CardContent className='p-0 overflow-hidden'>
                {renderHeader()}
                <div className='overflow-x-auto scrollbar-hide pb-4'>
                    {loadError ? (
                        <div className='rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 p-6 text-center text-rose-700'>
                            <p className='text-[10px] font-black uppercase tracking-widest'>{t('dashboard.page.calendar.title')}</p>
                            <p className='mt-2 text-xs font-bold break-words'>{loadError}</p>
                        </div>
                    ) : (
                        <>
                            {renderDays()}
                            {renderCells()}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

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
            } catch (_error) {
                setLoadError(t('dashboard.page.calendar.error.loadCalendar'))
            }
        }
        void loadRecords()

        const handleSync = () => loadRecords()
        window.addEventListener('xdfc_production_plans_updated', handleSync)
        return () => window.removeEventListener('xdfc_production_plans_updated', handleSync)
    }, [t])

    const renderHeader = () => {
        return (
            <div className='mb-1.5 flex flex-col gap-0.5 rounded-[16px] border border-dashed border-muted/50 bg-muted/5 p-2 md:mb-2 md:rounded-[20px] md:p-2.5'>
                <div className='flex flex-col justify-between gap-2 sm:flex-row sm:items-center'>
                    <div className='flex items-center gap-2 md:gap-2.5'>
                        <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner transition-all md:size-8 md:rounded-xl'>
                            <CalendarIcon className='size-3.5 transition-transform group-hover:scale-110 md:size-4' />
                        </div>
                        <div className='flex flex-col gap-0.5 overflow-hidden'>
                            <h1 className='truncate text-sm font-black tracking-tighter italic uppercase text-primary md:text-base'>
                                {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                            </h1>
                            <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 truncate'>
                                {t('dashboard.page.calendar.view.timeline')}
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center gap-1.5 md:gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setCurrentMonth(today)}
                            className='h-8 flex-1 rounded-full border-dashed border-primary/30 px-3 text-[8px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5 sm:flex-none md:px-4 md:text-[9px]'
                        >
                            {t('dashboard.page.calendar.view.today')}
                        </Button>
                        <div className='flex items-center bg-background border border-dashed border-muted/50 rounded-full p-0.5 shadow-sm'>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-7 rounded-full transition-all hover:bg-muted/10'
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            >
                                <ChevronLeft className='size-4 text-muted-foreground' />
                            </Button>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-7 rounded-full transition-all hover:bg-muted/10'
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
            <div className='mb-1.5 grid grid-cols-7 px-1'>
                {days.map((day, i) => (
                    <div key={i} className='text-center text-[8px] font-black uppercase tracking-[0.26em] text-muted-foreground/30 italic'>
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
            <div className='grid grid-cols-7 gap-1 border border-dashed border-muted/50 bg-muted/10 p-0.5 shadow-inner rounded-xl md:rounded-[20px]'>
                {calendarDates.map((day, i) => {
                    const isInMonth = isSameMonth(day, monthStart)
                    const isToday = isSameDay(day, today)

                    const dayRecord = records.find(r => isSameDay(r.date, day))

                    const hasOutput = dayRecord && dayRecord.output > 0

                    return (
                            <div
                                key={i}
                                className={cn(
                                    'group relative min-h-[40px] cursor-pointer rounded-md border border-transparent bg-background p-1 transition-all md:min-h-[48px] md:rounded-lg md:p-1.5',
                                    !isInMonth && 'bg-muted/5 opacity-30 pointer-events-none',
                                isInMonth && 'hover:border-primary/20 hover:shadow-lg hover:bg-white',
                                isToday && 'ring-2 ring-primary/20 bg-primary/2'
                            )}
                            onClick={() => onDateClick(day)}
                        >
                            <div className='flex justify-between items-start'>
                                <span className={cn(
                                    'flex size-6 items-center justify-center rounded-md text-[11px] font-black italic tracking-tighter tabular-nums transition-colors',
                                    isToday ? 'bg-primary text-white shadow-md' : 'text-slate-400'
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {hasOutput && (
                                    <Badge className='h-4 rounded-md border-none bg-emerald-500/10 px-1.5 py-0 text-[7px] font-black italic text-emerald-600 shadow-none'>
                                        {dayRecord.output} {t('dashboard.page.calendar.units.pcs')}
                                    </Badge>
                                )}
                            </div>

                            <div className='mt-2 space-y-1'>
                                {dayRecord?.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className='flex flex-col gap-0.5 group/item transition-all'>
                                        <div className='flex items-center gap-1'>
                                            <div className='size-1 rounded-full bg-blue-500 shrink-0' />
                                            <span className='truncate text-[9px] font-bold uppercase tracking-tight text-secondary'>{item.name}</span>
                                        </div>
                                        <div className='flex items-center gap-1.5 pl-2 opacity-40 text-[7px] font-mono'>
                                            <span>#{item.orderNo}</span>
                                        </div>
                                    </div>
                                ))}
                                {dayRecord && dayRecord.items.length > 2 && (
                                    <p className='pl-2 pt-0.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground/30 italic'>
                                        + {dayRecord.items.length - 2} {t('dashboard.page.calendar.view.moreNodes')}
                                    </p>
                                )}
                            </div>

                            {/* Task Hint */}
                            {hasOutput && (
                                <div className='absolute bottom-2 right-2 transform translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100'>
                                    <Activity className='size-2.5 animate-pulse text-primary' />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className='animate-in fade-in duration-700'>
            <div className='flex flex-col'>
                {renderHeader()}
                <div className='flex-1'>
                    {loadError ? (
                        <div className='rounded-[16px] border border-dashed border-rose-200 bg-rose-50/70 p-4 text-center text-rose-700'>
                            <p className='text-[10px] font-black uppercase tracking-widest'>{t('dashboard.page.calendar.title')}</p>
                            <p className='mt-2 text-xs font-bold wrap-break-word'>{loadError}</p>
                        </div>
                    ) : (
                        <>
                            {renderDays()}
                            {renderCells()}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ClipboardList,
    Users,
    Package,
    TrendingUp,
    FileText,
    AlertTriangle,
    Clock
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProductionCalendarService, type DailyProductionRecord } from '../services/production-calendar-service'
import { useLanguage } from '@/context/language-provider'
import { type TranslationKey } from '@/locales'

interface DayDetailSheetProps {
    date: Date | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function DayDetailSheetBody({ date }: { date: Date }) {
    const { t, locale } = useLanguage()
    const dateLocale = locale === 'zh-CN' ? zhCN : enUS
    const [detail, setDetail] = useState<DailyProductionRecord | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const dateFormat = t('dashboard.page.calendar.detail.dateFormat' as TranslationKey)

    useEffect(() => {
        let cancelled = false

        void ProductionCalendarService.getDayDetails(date)
            .then((res: DailyProductionRecord | null) => {
                if (cancelled) return
                setDetail(res)
                setIsLoading(false)
            })
            .catch((_error) => {
                if (cancelled) return
                setDetail(null)
                setLoadError(t('dashboard.page.calendar.error.loadDetails'))
                setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [date, t])

    return (
        <ScrollArea className='h-full'>
            <div className='p-6 space-y-6'>
                <SheetHeader className='text-start'>
                    <div className='flex items-center gap-3 mb-2'>
                        <div className='size-14 rounded-2xl bg-blue-600 flex flex-col items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0 border-b-4 border-blue-800'>
                            <span className='text-[9px] font-black uppercase tracking-widest opacity-60'>{format(date, 'MMM', { locale: dateLocale })}</span>
                            <span className='text-lg font-black leading-none italic'>{format(date, 'd')}</span>
                        </div>
                        <div>
                            <SheetTitle className='text-lg font-black tracking-tighter italic text-slate-800 uppercase'>
                              {format(date, dateFormat, { locale: dateLocale })}
                            </SheetTitle>
                            <SheetDescription className='text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic'>
                              {t('dashboard.page.calendar.detail.snapshot')}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-muted/5 p-4 rounded-2xl border border-dashed border-muted/50 shadow-inner'>
                        <div className='text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1 flex items-center gap-1'>
                            <Package className='size-3' /> {t('dashboard.page.calendar.stats.totalOutput')}
                        </div>
                        <div className='text-2xl font-black text-slate-800 italic'>{detail?.output || 0} <span className='text-[10px] font-black text-muted-foreground/30 uppercase'>{t('dashboard.page.calendar.units.pcs')}</span></div>
                    </div>
                    <div className='bg-muted/5 p-4 rounded-2xl border border-dashed border-muted/50 shadow-inner'>
                        <div className='text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1 flex items-center gap-1'>
                            <TrendingUp className='size-3' /> {t('dashboard.page.calendar.stats.estPerformance')}
                        </div>
                        <div className='text-2xl font-black text-blue-600/20 italic'>--</div>
                    </div>
                </div>

                <div className='space-y-3'>
                    <h4 className='text-sm font-semibold flex items-center gap-2 px-1 text-foreground/80'>
                        <ClipboardList className='size-4 text-blue-500' />
                        {t('dashboard.page.calendar.detail.title')}
                    </h4>

                    <div className='space-y-2'>
                        {isLoading ? (
                            <div className='py-8 text-center text-xs text-muted-foreground animate-pulse'>...</div>
                        ) : loadError ? (
                            <div className='py-12 text-center border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/70 px-6'>
                                <div className='size-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3'>
                                    <AlertTriangle className='size-5 text-rose-400' />
                                </div>
                                <p className='text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]'>
                                  {t('dashboard.page.calendar.title')}
                                </p>
                                <p className='mt-2 text-xs font-bold text-rose-700/80 wrap-break-word'>{loadError}</p>
                            </div>
                        ) : detail && detail.items.length > 0 ? (
                            detail.items.map((item, i) => (
                                <div key={i} className='bg-card p-3 rounded-lg border border-border shadow-sm flex items-center justify-between group hover:border-blue-500/50 transition-colors'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-8 rounded bg-muted/50 flex items-center justify-center border border-border'>
                                            <Package className='size-4 text-muted-foreground' />
                                        </div>
                                        <div>
                                            <div className='text-sm font-medium text-foreground/80'>{item.name}</div>
                                            <div className='text-[11px] text-muted-foreground'>
                                              {t('dashboard.page.calendar.detail.item.order')}: {item.orderNo} | {t('dashboard.page.calendar.detail.item.quantity')}: {item.quantity}{t('dashboard.page.calendar.units.pcs')}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant='outline' className='text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-normal'>{item.status}</Badge>
                                </div>
                            ))
                        ) : (
                            <div className='py-12 text-center border-2 border-dashed border-muted/20 rounded-2xl bg-muted/5'>
                                <div className='size-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3'>
                                    <Package className='size-5 text-muted-foreground/20' />
                                </div>
                                <p className='text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]'>
                                  {t('dashboard.page.calendar.detail.noRecords')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className='space-y-3 pt-2'>
                    <h4 className='text-sm font-semibold flex items-center gap-2 px-1 text-foreground/80'>
                        <Users className='size-4 text-blue-500' />
                        {t('dashboard.page.calendar.detail.comingSoon')}
                    </h4>
                    <div className='bg-muted/30 rounded-xl p-6 border border-dashed flex flex-col items-center justify-center text-center space-y-3'>
                        <div className='p-3 bg-background rounded-full shadow-sm border'>
                            <Clock className='size-6 text-slate-400' />
                        </div>
                        <div className='space-y-1'>
                            <p className='text-xs font-bold text-slate-500'>{t('dashboard.page.calendar.detail.comingSoon')}</p>
                            <p className='text-[10px] text-muted-foreground leading-relaxed max-w-[200px]'>
                                {t('dashboard.page.calendar.detail.qualityWaiting')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='bg-slate-500/5 border border-slate-500/10 rounded-lg p-3 flex gap-3'>
                    <AlertTriangle className='size-5 text-slate-400 shrink-0' />
                    <div>
                        <div className='text-xs font-bold text-slate-500 italic'>{t('dashboard.page.calendar.detail.qualityData')}</div>
                        <p className='text-[11px] text-muted-foreground mt-0.5 leading-relaxed'>
                            {t('dashboard.page.calendar.detail.qualityWaiting')}
                        </p>
                    </div>
                </div>

                <div className='pt-6 pb-10'>
                    <Button className='w-full gap-2 shadow-lg h-10' disabled>
                        <FileText className='size-4' /> {t('dashboard.page.calendar.detail.comingSoon')}: {t('dashboard.page.calendar.detail.generateReport')}
                    </Button>
                </div>
            </div>
        </ScrollArea>
    )
}

export function DayDetailSheet({ date, open, onOpenChange }: DayDetailSheetProps) {
    if (!date) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='sm:max-w-md bg-background p-0 border-l-0'>
                {open ? <DayDetailSheetBody key={date.toISOString()} date={date} /> : null}
            </SheetContent>
        </Sheet>
    )
}

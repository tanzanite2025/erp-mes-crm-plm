import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { type TranslationKey } from '@/locales'
import { zhCN, enUS } from 'date-fns/locale'
import {
  ClipboardList,
  Users,
  Package,
  TrendingUp,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  ProductionCalendarService,
  type DailyProductionRecord,
} from '../services/production-calendar-service'

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
  const dateFormat = t(
    'dashboard.page.calendar.detail.dateFormat' as TranslationKey
  )

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
      <div className='space-y-6 p-6'>
        <SheetHeader className='text-start'>
          <div className='mb-2 flex items-center gap-3'>
            <div className='flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border-b-4 border-blue-800 bg-blue-600 text-white shadow-xl shadow-blue-500/20'>
              <span className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                {format(date, 'MMM', { locale: dateLocale })}
              </span>
              <span className='text-lg leading-none font-black italic'>
                {format(date, 'd')}
              </span>
            </div>
            <div>
              <SheetTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic'>
                {format(date, dateFormat, { locale: dateLocale })}
              </SheetTitle>
              <SheetDescription className='text-[10px] font-bold tracking-widest text-muted-foreground/40 uppercase italic'>
                {t('dashboard.page.calendar.detail.snapshot')}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 shadow-inner'>
            <div className='mb-1 flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              <Package className='size-3' />{' '}
              {t('dashboard.page.calendar.stats.totalOutput')}
            </div>
            <div className='text-2xl font-black text-slate-800 italic'>
              {detail?.output || 0}{' '}
              <span className='text-[10px] font-black text-muted-foreground/30 uppercase'>
                {t('dashboard.page.calendar.units.pcs')}
              </span>
            </div>
          </div>
          <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 shadow-inner'>
            <div className='mb-1 flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              <TrendingUp className='size-3' />{' '}
              {t('dashboard.page.calendar.stats.estPerformance')}
            </div>
            <div className='text-2xl font-black text-blue-600/20 italic'>
              --
            </div>
          </div>
        </div>

        <div className='space-y-3'>
          <h4 className='flex items-center gap-2 px-1 text-sm font-semibold text-foreground/80'>
            <ClipboardList className='size-4 text-blue-500' />
            {t('dashboard.page.calendar.detail.title')}
          </h4>

          <div className='space-y-2'>
            {isLoading ? (
              <div className='animate-pulse py-8 text-center text-xs text-muted-foreground'>
                ...
              </div>
            ) : loadError ? (
              <div className='rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/70 px-6 py-12 text-center'>
                <div className='mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white shadow-sm'>
                  <AlertTriangle className='size-5 text-rose-400' />
                </div>
                <p className='text-[10px] font-black tracking-[0.2em] text-rose-600 uppercase'>
                  {t('dashboard.page.calendar.title')}
                </p>
                <p className='mt-2 text-xs font-bold wrap-break-word text-rose-700/80'>
                  {loadError}
                </p>
              </div>
            ) : detail && detail.items.length > 0 ? (
              detail.items.map((item, i) => (
                <div
                  key={i}
                  className='group flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-blue-500/50'
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex size-8 items-center justify-center rounded border border-border bg-muted/50'>
                      <Package className='size-4 text-muted-foreground' />
                    </div>
                    <div>
                      <div className='text-sm font-medium text-foreground/80'>
                        {item.name}
                      </div>
                      <div className='text-[11px] text-muted-foreground'>
                        {t('dashboard.page.calendar.detail.item.order')}:{' '}
                        {item.orderNo} |{' '}
                        {t('dashboard.page.calendar.detail.item.quantity')}:{' '}
                        {item.quantity}
                        {t('dashboard.page.calendar.units.pcs')}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant='outline'
                    className='border-emerald-500/30 bg-emerald-500/10 text-[10px] font-normal text-emerald-500'
                  >
                    {item.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className='rounded-2xl border-2 border-dashed border-muted/20 bg-muted/5 py-12 text-center'>
                <div className='mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white shadow-sm'>
                  <Package className='size-5 text-muted-foreground/20' />
                </div>
                <p className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/30 uppercase'>
                  {t('dashboard.page.calendar.detail.noRecords')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className='space-y-3 pt-2'>
          <h4 className='flex items-center gap-2 px-1 text-sm font-semibold text-foreground/80'>
            <Users className='size-4 text-blue-500' />
            {t('dashboard.page.calendar.detail.comingSoon')}
          </h4>
          <div className='flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed bg-muted/30 p-6 text-center'>
            <div className='rounded-full border bg-background p-3 shadow-sm'>
              <Clock className='size-6 text-slate-400' />
            </div>
            <div className='space-y-1'>
              <p className='text-xs font-bold text-slate-500'>
                {t('dashboard.page.calendar.detail.comingSoon')}
              </p>
              <p className='max-w-[200px] text-[10px] leading-relaxed text-muted-foreground'>
                {t('dashboard.page.calendar.detail.qualityWaiting')}
              </p>
            </div>
          </div>
        </div>

        <div className='flex gap-3 rounded-lg border border-slate-500/10 bg-slate-500/5 p-3'>
          <AlertTriangle className='size-5 shrink-0 text-slate-400' />
          <div>
            <div className='text-xs font-bold text-slate-500 italic'>
              {t('dashboard.page.calendar.detail.qualityData')}
            </div>
            <p className='mt-0.5 text-[11px] leading-relaxed text-muted-foreground'>
              {t('dashboard.page.calendar.detail.qualityWaiting')}
            </p>
          </div>
        </div>

        <div className='pt-6 pb-10'>
          <Button className='h-10 w-full gap-2 shadow-lg' disabled>
            <FileText className='size-4' />{' '}
            {t('dashboard.page.calendar.detail.comingSoon')}:{' '}
            {t('dashboard.page.calendar.detail.generateReport')}
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}

export function DayDetailSheet({
  date,
  open,
  onOpenChange,
}: DayDetailSheetProps) {
  if (!date) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='border-l-0 bg-background p-0 sm:max-w-md'>
        {open ? (
          <DayDetailSheetBody key={date.toISOString()} date={date} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

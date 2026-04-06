import { CheckCircle2, Clock, MapPin, Package } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { LogisticsEvent } from './services/purchase-logistics-service'

interface TimelineProps {
  events: LogisticsEvent[]
  className?: string
}

function getStatusLabel(status: string, t: ReturnType<typeof useLanguage>['t']) {
  switch (status) {
    case 'Pending':
      return t('purchase.logistics.statusPending')
    case 'InTransit':
      return t('purchase.logistics.statusInTransit')
    case 'Delivered':
      return t('purchase.logistics.statusDelivered')
    case 'Canceled':
      return t('purchase.logistics.statusCanceled')
    default:
      return status
  }
}

export function PurchaseLogisticsTimeline({ events, className }: TimelineProps) {
  const { locale, t } = useLanguage()

  if (!events || events.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-slate-300'>
        <Package className='mb-4 size-12 opacity-20' />
        <p className='text-[10px] font-black italic uppercase tracking-widest'>
          {t('purchase.logistics.timelineEmpty')}
        </p>
      </div>
    )
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )

  return (
    <div className={cn('relative space-y-0.5', className)}>
      <div className='absolute bottom-4 left-[15px] top-4 w-px border-l border-dashed border-slate-200' />

      {sortedEvents.map((event, index) => {
        const isLatest = index === 0
        const isDelivered = event.status === 'Delivered'

        return (
          <div
            key={event.id || index}
            className='group relative flex gap-4 pb-8 animate-in fade-in slide-in-from-left-2'
          >
            <div
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors',
                isLatest
                  ? 'animate-pulse border-emerald-400 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-400',
                isDelivered && !isLatest && 'border-emerald-200 bg-emerald-50 text-emerald-500'
              )}
            >
              {isDelivered ? (
                <CheckCircle2 className='size-4' />
              ) : isLatest ? (
                <MapPin className='size-4' />
              ) : (
                <Clock className='size-4' />
              )}
            </div>

            <div className={cn('flex-1 space-y-1 pt-1', isLatest ? 'opacity-100' : 'opacity-70')}>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-mono leading-none text-slate-400'>
                  {new Date(event.time).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {isLatest && (
                  <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 italic'>
                    {t('purchase.logistics.timelineLatest')}
                  </span>
                )}
              </div>

              <h4 className='text-xs font-black italic tracking-tight text-slate-900 transition-colors group-hover:text-emerald-600'>
                {event.location} - {event.description}
              </h4>

              <div className='flex items-center gap-1 text-[10px] font-medium text-slate-500'>
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter',
                    event.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-700'
                      : event.status === 'Pending'
                        ? 'bg-amber-100 text-amber-700'
                        : event.status === 'Canceled'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {getStatusLabel(event.status, t)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

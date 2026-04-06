import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Clock, MapPin, Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { LogisticsStatus, logisticsStatuses, type LogisticsEvent } from '../types'

interface LogisticsTimelineProps {
  events: LogisticsEvent[]
}

const statusIcons: Record<LogisticsStatus, ReactNode> = {
  Pending: <Clock className='size-3.5' />,
  InTransit: <Truck className='size-3.5' />,
  Delivered: <CheckCircle2 className='size-3.5' />,
  Exception: <AlertCircle className='size-3.5' />,
  Canceled: <AlertCircle className='size-3.5 opacity-50' />,
}

export function LogisticsTimeline({ events }: LogisticsTimelineProps) {
  const { locale, t } = useLanguage()

  if (events.length === 0) {
    return (
      <div className='py-20 flex flex-col items-center justify-center space-y-3 opacity-30'>
        <Truck className='size-10 stroke-[1]' />
        <p className='text-[10px] font-black uppercase tracking-widest'>
          {t('trading.logistics.timelineEmpty')}
        </p>
      </div>
    )
  }

  return (
    <div className='relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gradient-to-b before:from-primary/40 before:via-muted before:to-transparent'>
      {events.map((event, index) => {
        const statusMeta = logisticsStatuses.find((status) => status.value === event.status)

        return (
          <div
            key={event.id}
            className='relative flex gap-4 animate-in slide-in-from-left-2 duration-300'
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={cn(
                'relative z-10 size-8 rounded-full flex items-center justify-center border-2 border-background shadow-sm ring-4 ring-background',
                index === 0 ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'
              )}
            >
              {statusIcons[event.status] || <MapPin className='size-3.5' />}
            </div>

            <div className='flex-1 space-y-1.5 pb-2'>
              <div className='flex items-center justify-between'>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border',
                    statusMeta?.color
                  )}
                >
                  {statusMeta ? t(statusMeta.labelKey) : event.status}
                </span>
                <span className='text-[10px] font-bold text-muted-foreground/60 tabular-nums'>
                  {new Date(event.time).toLocaleString(locale)}
                </span>
              </div>

              <div className='bg-muted/30 p-3 rounded-2xl border border-dashed border-muted-foreground/10'>
                <p className='text-[12px] font-black text-secondary leading-snug'>{event.description}</p>
                <div className='flex items-center gap-1 mt-1.5 opacity-60'>
                  <MapPin className='size-2.5' />
                  <span className='text-[10px] font-bold uppercase'>
                    {event.location || t('trading.logistics.unknownSite')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

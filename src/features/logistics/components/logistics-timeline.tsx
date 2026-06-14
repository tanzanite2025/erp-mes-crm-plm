import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Clock, MapPin, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  type LogisticsEvent,
  type LogisticsStatus,
  logisticsStatuses,
} from '../data/schema'

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
      <div className='flex flex-col items-center justify-center space-y-3 py-20 opacity-30'>
        <Truck className='size-10 stroke-1' />
        <p className='text-[10px] font-black tracking-widest uppercase'>
          {t('trading.logistics.timelineEmpty')}
        </p>
      </div>
    )
  }

  return (
    <div className='relative space-y-6 pl-4 before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-[1.5px] before:bg-linear-to-b before:from-primary/40 before:via-muted before:to-transparent'>
      {events.map((event, index) => {
        const statusMeta = logisticsStatuses.find(
          (status) => status.value === event.status
        )

        return (
          <div
            key={event.id}
            className='relative flex animate-in gap-4 duration-300 slide-in-from-left-2'
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={cn(
                'relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-background shadow-sm ring-4 ring-background',
                index === 0
                  ? 'scale-110 bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {statusIcons[event.status] || <MapPin className='size-3.5' />}
            </div>

            <div className='flex-1 space-y-1.5 pb-2'>
              <div className='flex items-center justify-between'>
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[10px] font-black tracking-tighter uppercase',
                    statusMeta?.color
                  )}
                >
                  {statusMeta ? t(statusMeta.labelKey) : event.status}
                </span>
                <span className='text-[10px] font-bold text-muted-foreground/60 tabular-nums'>
                  {new Date(event.time).toLocaleString(locale)}
                </span>
              </div>

              <div className='rounded-2xl border border-dashed border-muted-foreground/10 bg-muted/30 p-3'>
                <p className='text-[12px] leading-snug font-black text-secondary'>
                  {event.description}
                </p>
                <div className='mt-1.5 flex items-center gap-1 opacity-60'>
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

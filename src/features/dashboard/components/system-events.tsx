import { useState } from 'react'
import {
  ShieldCheck,
  Printer,
  Hammer,
  Package,
  ChevronRight,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useAssets } from '@/features/equipment-tooling/hooks/use-assets'

export function SystemEvents({ className }: { className?: string }) {
  const { t } = useLanguage()
  const [openCategory, setOpenCategory] = useState<string | null>('equipment')
  const { molds, furnaces } = useAssets()

  const CATEGORIES = [
    {
      id: 'security',
      label: t('dashboard.page.systemEvents.categories.security'),
      icon: ShieldCheck,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      id: 'audit',
      label: t('dashboard.page.systemEvents.categories.audit'),
      icon: Printer,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'equipment',
      label: t('dashboard.page.systemEvents.categories.equipment'),
      icon: Hammer,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
    {
      id: 'process',
      label: t('dashboard.page.systemEvents.categories.process'),
      icon: Package,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  const renderEquipmentEvents = () => {
    const events = [
      ...molds.map((m) => ({
        id: `mold-${m.id}`,
        title: `${m.sn} (${t('dashboard.page.systemEvents.equipment.mold')})`,
        desc: `${m.name} - ${t('dashboard.page.systemEvents.equipment.stats')}: ${m.currentCycles} / ${m.maxCycles}`,
        status: m.status,
        isAlert: m.status === 'CHECKING' || m.status === 'MAINTENANCE',
      })),
      ...furnaces.map((f) => ({
        id: `furnace-${f.id}`,
        title: `${f.sn} (${t('dashboard.page.systemEvents.equipment.furnace')})`,
        desc: `${f.name} - ${t('dashboard.page.systemEvents.equipment.temp')}: ${f.currentTemp} ℃`,
        status: f.status,
        isAlert: f.status === 'FAULT' || f.status === 'MAINTENANCE',
      })),
    ]

    if (events.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center'>
          <div className='mb-2 flex size-8 items-center justify-center rounded-full bg-white shadow-sm'>
            <div className='size-2 animate-pulse rounded-full bg-slate-300' />
          </div>
          <p className='text-[10px] font-bold tracking-widest text-slate-400 uppercase'>
            {t('dashboard.page.systemEvents.equipment.waiting')}
          </p>
        </div>
      )
    }

    return (
      <div className='space-y-2'>
        {events.map((event) => (
          <div
            key={event.id}
            className='flex items-start gap-3 rounded-lg border border-slate-100/50 bg-slate-50 p-3'
          >
            <div
              className={cn(
                'mt-1 rounded-full p-1.5',
                event.isAlert
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-blue-100 text-blue-600'
              )}
            >
              {event.isAlert ? (
                <AlertTriangle className='h-3 w-3' />
              ) : (
                <Activity className='h-3 w-3' />
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center justify-between gap-2'>
                <p className='truncate text-xs font-bold text-slate-700'>
                  {event.title}
                </p>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase',
                    event.isAlert
                      ? 'bg-orange-200 text-orange-700'
                      : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {event.status}
                </span>
              </div>
              <p className='mt-0.5 truncate text-[10px] text-slate-500'>
                {event.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex animate-in flex-col gap-3.5 duration-700 fade-in',
        className
      )}
    >
      {/* Log Categories List */}
      <div className='flex flex-col gap-3'>
        {CATEGORIES.map((cat) => (
          <Collapsible
            key={cat.id}
            open={openCategory === cat.id}
            onOpenChange={(isOpen) => setOpenCategory(isOpen ? cat.id : null)}
            className='relative overflow-hidden rounded-[24px] border border-dashed border-muted/30 bg-muted/5 shadow-none transition-all hover:bg-muted/10'
          >
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
            <CollapsibleTrigger asChild>
              <div className='group relative z-10 flex cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-muted/5'>
                <div className='flex items-center gap-3.5'>
                  <div
                    className={cn(
                      'rounded-xl border border-transparent p-2 shadow-sm transition-all group-hover:scale-110 group-hover:border-current/10',
                      cat.bgColor,
                      cat.color
                    )}
                  >
                    <cat.icon className='h-4 w-4' />
                  </div>
                  <span className='text-xs font-black tracking-tight text-slate-700 uppercase'>
                    {cat.label}
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground/30 transition-transform duration-300',
                    openCategory === cat.id && 'rotate-90 text-slate-500'
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className='relative z-10 pb-1'>
              <div className='px-3.5 pt-0 pb-3.5'>
                {cat.id === 'equipment' ? (
                  renderEquipmentEvents()
                ) : (
                  <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted/20 bg-background/50 p-8 text-center'>
                    <div className='mb-2 flex size-8 items-center justify-center rounded-full border border-muted/20 bg-background shadow-inner'>
                      <div className='size-2 animate-pulse rounded-full bg-muted-foreground/20' />
                    </div>
                    <p className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      {t('dashboard.page.systemEvents.equipment.offline')}
                    </p>
                    <p className='mt-1 font-mono text-[8px] text-muted-foreground/20 uppercase italic'>
                      WAITING_FOR_STREAM
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

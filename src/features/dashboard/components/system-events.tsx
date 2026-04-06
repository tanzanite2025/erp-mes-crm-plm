import { ShieldCheck, Printer, Hammer, Package, ChevronRight, Activity, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { useAssets } from '@/features/equipment-tooling/services/asset-service'
import { useLanguage } from '@/context/language-provider'

export function SystemEvents({ className }: { className?: string }) {
    const { t } = useLanguage()
    const [openCategory, setOpenCategory] = useState<string | null>('equipment')
    const { molds, furnaces } = useAssets()

    const CATEGORIES = [
        { id: 'security', label: t('dashboard.page.systemEvents.categories.security'), icon: ShieldCheck, color: 'text-red-500', bgColor: 'bg-red-500/10' },
        { id: 'audit', label: t('dashboard.page.systemEvents.categories.audit'), icon: Printer, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
        { id: 'equipment', label: t('dashboard.page.systemEvents.categories.equipment'), icon: Hammer, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
        { id: 'process', label: t('dashboard.page.systemEvents.categories.process'), icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
    ]

    const renderEquipmentEvents = () => {
        const events = [
            ...molds.map(m => ({
                id: `mold-${m.id}`,
                title: `${m.sn} (${t('dashboard.page.systemEvents.equipment.mold')})`,
                desc: `${m.name} - ${t('dashboard.page.systemEvents.equipment.stats')}: ${m.currentCycles} / ${m.maxCycles}`,
                status: m.status,
                isAlert: m.status === 'CHECKING' || m.status === 'MAINTENANCE'
            })),
            ...furnaces.map(f => ({
                id: `furnace-${f.id}`,
                title: `${f.sn} (${t('dashboard.page.systemEvents.equipment.furnace')})`,
                desc: `${f.name} - ${t('dashboard.page.systemEvents.equipment.temp')}: ${f.currentTemp} ℃`,
                status: f.status,
                isAlert: f.status === 'FAULT' || f.status === 'MAINTENANCE'
            }))
        ]

        if (events.length === 0) {
            return (
                <div className='rounded-lg bg-slate-50/50 border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center'>
                    <div className='size-8 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm'>
                        <div className='size-2 rounded-full bg-slate-300 animate-pulse' />
                    </div>
                    <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>{t('dashboard.page.systemEvents.equipment.waiting')}</p>
                </div>
            )
        }

        return (
            <div className='space-y-2'>
                {events.map((event) => (
                    <div key={event.id} className='flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100/50'>
                        <div className={cn(
                            'mt-1 rounded-full p-1.5',
                            event.isAlert ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        )}>
                            {event.isAlert ? <AlertTriangle className='h-3 w-3' /> : <Activity className='h-3 w-3' />}
                        </div>
                        <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between gap-2'>
                                <p className='text-xs font-bold text-slate-700 truncate'>{event.title}</p>
                                <span className={cn(
                                    'text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase',
                                    event.isAlert ? 'bg-orange-200 text-orange-700' : 'bg-slate-200 text-slate-600'
                                )}>
                                    {event.status}
                                </span>
                            </div>
                            <p className='text-[10px] text-slate-500 mt-0.5 truncate'>{event.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={cn('space-y-3', className)}>
            {CATEGORIES.map((cat) => (
                <Collapsible
                    key={cat.id}
                    open={openCategory === cat.id}
                    onOpenChange={(isOpen) => setOpenCategory(isOpen ? cat.id : null)}
                    className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-none overflow-hidden transition-all hover:bg-muted/10'
                >
                    <CollapsibleTrigger asChild>
                        <div className='flex items-center justify-between p-4 cursor-pointer hover:bg-muted/5 transition-colors group'>
                            <div className='flex items-center gap-4'>
                                <div className={cn('rounded-xl p-2.5 shadow-sm transition-all group-hover:scale-110 border border-transparent group-hover:border-current/10', cat.bgColor, cat.color)}>
                                    <cat.icon className='h-4 w-4' />
                                </div>
                                <span className='text-sm font-black text-slate-700 tracking-tight uppercase'>{cat.label}</span>
                            </div>
                            <ChevronRight 
                                className={cn(
                                    'h-4 w-4 text-muted-foreground/30 transition-transform duration-300',
                                    openCategory === cat.id && 'rotate-90 text-slate-500'
                                )} 
                            />
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className='pb-1'>
                        <div className='px-4 pb-4 pt-0'>
                            {cat.id === 'equipment' ? renderEquipmentEvents() : (
                                <div className='rounded-2xl bg-muted/5 border-2 border-dashed border-muted/50 p-10 flex flex-col items-center justify-center text-center'>
                                    <div className='size-10 rounded-full bg-background flex items-center justify-center mb-3 shadow-inner border border-muted/20'>
                                        <div className='size-2.5 rounded-full bg-muted-foreground/20 animate-pulse' />
                                    </div>
                                    <p className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('dashboard.page.systemEvents.equipment.offline')}</p>
                                    <p className='text-[9px] mt-1 text-muted-foreground/20 font-mono uppercase italic'>WAITING_FOR_STREAM</p>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    )
}

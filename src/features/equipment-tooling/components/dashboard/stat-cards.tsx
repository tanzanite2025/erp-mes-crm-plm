'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Database, CheckCircle2, Settings, AlertTriangle, type LucideIcon, Zap, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

interface StatCardProps {
    title: string
    value: number
    total: number
    color: string
    icon: LucideIcon
    subtext?: string
}

export const StatCard = ({ title, value, total, color, icon: Icon, subtext }: StatCardProps) => {
    const { t } = useLanguage()
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0

    const colorMap: Record<string, string> = {
        BLUE: 'text-blue-500 shadow-blue-500/20 bg-blue-500',
        SLATE: 'text-slate-500 shadow-slate-500/20 bg-slate-500',
        GREEN: 'text-emerald-500 shadow-emerald-500/20 bg-emerald-500',
        AMBER: 'text-amber-500 shadow-amber-500/20 bg-amber-500',
        ROSE: 'text-rose-500 shadow-rose-500/20 bg-rose-500',
    }

    const activeColor = colorMap[color] || colorMap.BLUE

    return (
        <Card className='relative overflow-hidden border border-dashed border-muted/50 bg-muted/5 rounded-[24px] transition-all hover:bg-muted/10 group cursor-default h-full'>
            <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 pointer-events-none'>
                <Icon className='size-12' />
            </div>

            <CardContent className='p-4 h-full flex flex-col justify-between'>
                <div className='flex items-center justify-between mb-2'>
                    <div className='flex flex-col'>
                        <span className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic leading-none'>{title}</span>
                        {subtext && <span className='text-[8px] font-mono font-bold opacity-30 mt-1'>{subtext}</span>}
                    </div>
                    <div className={cn('p-1.5 rounded-lg bg-current/10', activeColor.split(' ')[0])}>
                        <Icon className='size-3.5' />
                    </div>
                </div>

                <div className='space-y-2'>
                    <div className='flex items-baseline gap-1'>
                        <span className='text-2xl font-black italic tracking-tighter tabular-nums leading-none'>{value}</span>
                        <span className='text-[10px] font-black opacity-20'>{t('equipmentTooling.dashboard.stats.units')}</span>
                    </div>

                    <div className='space-y-1'>
                        <div className='h-1 w-full bg-muted/20 rounded-full overflow-hidden flex shadow-inner'>
                            <div
                                className={cn('h-full transition-all duration-1000 ease-out shadow-[0_0_8px]', activeColor.split(' ')[2], activeColor.split(' ')[1])}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <div className='flex justify-between items-center'>
                            <span className='text-[8px] font-black uppercase tracking-widest opacity-30'>{t('equipmentTooling.dashboard.stats.saturation')}</span>
                            <span className={cn('text-[9px] font-mono font-bold', activeColor.split(' ')[0])}>{percentage}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface StatGroupProps {
    moldStats: {
        total: number
        idle: number
        inUse: number
        maintenance: number
        fault: number
        overdue?: number
    }
}

export const StatGroup = ({ moldStats }: StatGroupProps) => {
    const { t } = useLanguage()

    return (
        <div className='grid grid-cols-2 lg:grid-cols-6 gap-6'>
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.total.title')} value={moldStats.total} total={moldStats.total} color='BLUE' icon={Database} subtext={t('equipmentTooling.dashboard.stats.cards.total.subtext')} />
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.idle.title')} value={moldStats.idle} total={moldStats.total} color='SLATE' icon={CheckCircle2} subtext={t('equipmentTooling.dashboard.stats.cards.idle.subtext')} />
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.production.title')} value={moldStats.inUse} total={moldStats.total} color='GREEN' icon={Zap} subtext={t('equipmentTooling.dashboard.stats.cards.production.subtext')} />
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.maintenance.title')} value={moldStats.maintenance} total={moldStats.total} color='AMBER' icon={Settings} subtext={t('equipmentTooling.dashboard.stats.cards.maintenance.subtext')} />
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.overdue.title')} value={moldStats.overdue || 0} total={moldStats.total} color='ROSE' icon={ShieldAlert} subtext={t('equipmentTooling.dashboard.stats.cards.overdue.subtext')} />
            <StatCard title={t('equipmentTooling.dashboard.stats.cards.retired.title')} value={moldStats.fault} total={moldStats.total} color='SLATE' icon={AlertTriangle} subtext={t('equipmentTooling.dashboard.stats.cards.retired.subtext')} />
        </div>
    )
}

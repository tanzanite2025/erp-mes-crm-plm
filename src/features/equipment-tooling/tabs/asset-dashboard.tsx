'use client'

import { useAssetDashboard } from '../hooks/use-asset-dashboard'
import { BarChart3, Activity, ShieldCheck, Zap, AlertCircle, RotateCcw } from 'lucide-react'
import { StatGroup } from '../components/dashboard/stat-cards'
import { DetailSections } from '../components/dashboard/detail-sections'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'

export function AssetDashboard() {
    const { t } = useLanguage()
    const { data: stats, isLoading, isError, refresh } = useAssetDashboard()

    const getActivityStatusLabel = (status: 'ACTIVE' | 'RETURNED' | 'OVERDUE') => {
        if (status === 'RETURNED') {
            return t('equipmentTooling.loans.status.returned')
        }
        if (status === 'OVERDUE') {
            return t('equipmentTooling.loans.status.overdue')
        }
        return t('equipmentTooling.loans.status.lent')
    }

    if (isLoading && !stats) {
        return (
            <div className='flex flex-col gap-8 animate-pulse'>
                <div className='h-32 rounded-[32px] bg-muted/20' />
                <div className='grid grid-cols-6 gap-4'>
                    {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className='h-24 rounded-2xl bg-muted/10' />)}
                </div>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    <div className='h-[400px] rounded-[32px] bg-muted/5' />
                    <div className='h-[400px] rounded-[32px] bg-muted/5' />
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className='h-[60vh] flex flex-col items-center justify-center gap-6 border-2 border-dashed border-rose-500/20 rounded-[40px] bg-rose-500/5 animate-in fade-in duration-500'>
                <div className='size-16 rounded-full bg-rose-500/10 flex items-center justify-center'>
                    <AlertCircle className='size-8 text-rose-500 animate-pulse' />
                </div>
                <div className='text-center space-y-2'>
                    <h3 className='text-sm font-black uppercase tracking-widest text-rose-600 italic'>{t('equipmentTooling.dashboard.error.title')}</h3>
                    <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60'>{t('equipmentTooling.dashboard.error.description')}</p>
                </div>
                <Button
                    variant='outline'
                    onClick={() => void refresh()}
                    className='rounded-full h-10 px-8 border-rose-500/30 text-rose-600 font-bold text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all'
                >
                    <RotateCcw className='mr-2 size-3' /> {t('equipmentTooling.dashboard.error.retry')}
                </Button>
            </div>
        )
    }

    if (!stats) {
        return null
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={BarChart3}
                title={t('equipmentTooling.dashboard.header.title')}
                gradient
                statusBadge={
                    <div className='flex items-center gap-3'>
                        <div className='inline-flex h-5 items-center justify-center rounded-full border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 text-[8px] font-mono uppercase tracking-[0.2em] text-emerald-600 whitespace-nowrap'>
                            {t('equipmentTooling.dashboard.header.systemHealthLabel')}: {t('equipmentTooling.dashboard.header.stable')}
                        </div>
                        <div className='inline-flex h-5 items-center justify-center rounded-full border border-dashed border-cyan-500/20 bg-cyan-500/5 px-3 text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-600 whitespace-nowrap'>
                            {t('equipmentTooling.dashboard.header.activeSensorsLabel')}: {stats.moldStats.total + stats.furnaceStats.total} {t('equipmentTooling.dashboard.header.vectors')}
                        </div>
                    </div>
                }
            />

            <StatGroup moldStats={stats.moldStats} />

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                <div className='lg:col-span-2 space-y-8'>
                    <DetailSections moldStats={stats.moldStats} healthVectors={stats.healthVectors} />
                </div>

                <div className='flex flex-col gap-5 p-5 rounded-[32px] bg-muted/5 border border-dashed border-muted/50 relative overflow-hidden h-full'>
                    <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                            <Activity className='size-4 text-primary' />
                            <h4 className='text-[11px] font-black uppercase italic tracking-widest'>{t('equipmentTooling.dashboard.activity.title')}</h4>
                        </div>
                        <div className='flex items-center gap-1.5'>
                            <div className='size-1.5 rounded-full bg-emerald-500 animate-ping' />
                            <span className='text-[8px] font-black text-emerald-500 tracking-widest'>{t('equipmentTooling.dashboard.activity.live')}</span>
                        </div>
                    </div>

                    <div className='space-y-3.5'>
                        {stats.recentActivities.length === 0 ? (
                            <div className='h-32 flex flex-col items-center justify-center opacity-20'>
                                <Zap className='size-8 mb-2' />
                                <span className='text-[9px] font-black uppercase tracking-widest'>{t('equipmentTooling.dashboard.activity.empty')}</span>
                            </div>
                        ) : (
                            stats.recentActivities.map((log, index) => (
                                <div key={`${log.moldSn}-${log.loanDate}-${index}`} className='relative pl-6 border-l border-muted-foreground/10 py-0.5 group/item'>
                                    <div className='absolute left-[-4px] top-1.5 size-2 rounded-full bg-primary/30 group-hover/item:bg-primary transition-colors' />
                                    <div className='flex flex-col gap-0.5'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-[10px] font-black italic text-foreground uppercase tracking-tighter'>
                                                {log.moldSn} / {log.toFactory}
                                            </span>
                                            <span className='text-[8px] font-mono font-bold opacity-30'>{new Date(log.loanDate).toLocaleTimeString()}</span>
                                        </div>
                                            <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none'>
                                                {t('equipmentTooling.dashboard.activity.item', {
                                                    contactPerson: log.contactPerson,
                                                    status: getActivityStatusLabel(log.status),
                                                })}
                                            </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className='mt-auto pt-4 border-t border-dashed border-muted/50 grid grid-cols-2 gap-4'>
                        <div className='p-3 rounded-2xl bg-emerald-500/5 flex flex-col gap-1'>
                            <ShieldCheck className='size-4 text-emerald-500 opacity-50' />
                            <span className='text-[14px] font-black italic tracking-tighter leading-none'>{stats.healthVectors.avgLifeConsumpt.toFixed(1)}%</span>
                            <span className='text-[8px] font-black uppercase tracking-widest opacity-40'>{t('equipmentTooling.dashboard.summary.avgLifespan')}</span>
                        </div>
                        <div className='p-3 rounded-2xl bg-rose-500/5 flex flex-col gap-1'>
                            <AlertCircle className={cn('size-4 text-rose-500 opacity-50', stats.healthVectors.alertCount > 0 && 'animate-pulse')} />
                            <span className='text-[14px] font-black italic tracking-tighter leading-none'>{stats.healthVectors.alertCount}</span>
                            <span className='text-[8px] font-black uppercase tracking-widest opacity-40'>{t('equipmentTooling.dashboard.summary.criticalAlerts')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

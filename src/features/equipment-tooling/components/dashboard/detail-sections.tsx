'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Thermometer, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

interface DetailSectionsProps {
    moldStats: {
        total: number
        idle: number
        inUse: number
        maintenance: number
        fault: number
    }
    healthVectors: {
        avgLifeConsumpt: number
        alertCount: number
    }
}

export const DetailSections = ({ moldStats, healthVectors }: DetailSectionsProps) => {
    const { t } = useLanguage()

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <Card className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden'>
                <CardContent className='p-5'>
                    <div className='flex items-center gap-2 mb-4'>
                        <Activity className='size-4 text-primary' />
                        <h4 className='text-[11px] font-black uppercase italic tracking-widest text-foreground'>{t('equipmentTooling.dashboard.detail.statusTitle')}</h4>
                    </div>

                    <div className='flex flex-col gap-3'>
                        <StatusProgress label={t('equipmentTooling.dashboard.detail.labels.idle')} value={moldStats.idle} total={moldStats.total} color='bg-slate-500' />
                        <StatusProgress label={t('equipmentTooling.dashboard.detail.labels.production')} value={moldStats.inUse} total={moldStats.total} color='bg-emerald-500' />
                        <StatusProgress label={t('equipmentTooling.dashboard.detail.labels.maintenance')} value={moldStats.maintenance} total={moldStats.total} color='bg-amber-500' />
                        <StatusProgress label={t('equipmentTooling.dashboard.detail.labels.scrapped')} value={moldStats.fault} total={moldStats.total} color='bg-rose-500' />
                    </div>
                </CardContent>
            </Card>

            <Card className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                <CardContent className='p-5'>
                    <div className='flex items-center gap-2 mb-4'>
                        <ShieldCheck className='size-4 text-primary' />
                        <h4 className='text-[11px] font-black uppercase italic tracking-widest text-foreground'>{t('equipmentTooling.dashboard.detail.lifecycleTitle')}</h4>
                    </div>

                    <div className='flex flex-col gap-6'>
                        <div className='flex flex-col gap-1.5'>
                            <div className='flex items-baseline justify-between'>
                                <span className='text-[9px] font-black uppercase tracking-widest opacity-40 italic'>{t('equipmentTooling.dashboard.detail.avgLife')}</span>
                                <span className='text-xl font-black italic tracking-tighter tabular-nums'>{healthVectors.avgLifeConsumpt.toFixed(1)}%</span>
                            </div>
                            <div className='h-2.5 w-full bg-muted/20 rounded-md p-0.5 shadow-inner'>
                                <div
                                    className='h-full bg-primary rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all duration-1000'
                                    style={{ width: `${healthVectors.avgLifeConsumpt}%` }}
                                />
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            <div className='flex flex-col gap-1 p-3 rounded-2xl bg-muted/10 border border-muted-foreground/5'>
                                <div className='flex items-center gap-2 mb-1'>
                                    <Zap className='size-3 text-emerald-500' />
                                    <span className='text-[8px] font-black uppercase tracking-widest opacity-40'>{t('equipmentTooling.dashboard.detail.activeAssets')}</span>
                                </div>
                                <span className='text-xl font-black italic tracking-tighter tabular-nums'>{moldStats.inUse}</span>
                            </div>
                            <div className='flex flex-col gap-1 p-3 rounded-2xl bg-muted/10 border border-muted-foreground/5'>
                                <div className='flex items-center gap-2 mb-1'>
                                    <Thermometer className='size-3 text-amber-500' />
                                    <span className='text-[8px] font-black uppercase tracking-widest opacity-40'>{t('equipmentTooling.dashboard.detail.thermalLoad')}</span>
                                    <span className='ml-auto text-emerald-500 text-[8px] font-bold'>{t('equipmentTooling.dashboard.detail.normal')}</span>
                                </div>
                                <span className='text-xl font-black italic tracking-tighter tabular-nums text-amber-500'>{t('equipmentTooling.dashboard.detail.optimal')}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function StatusProgress({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
    const { t } = useLanguage()
    const percentage = total > 0 ? (value / total) * 100 : 0

    return (
        <div className='space-y-1.5'>
            <div className='flex justify-between items-end'>
                <span className='text-[9px] font-black uppercase tracking-widest opacity-60'>{label}</span>
                <span className='text-[9px] font-mono font-bold opacity-40 tabular-nums'>
                    {t('equipmentTooling.dashboard.detail.unitsValue', {
                        value,
                        percentage: percentage.toFixed(0),
                    })}
                </span>
            </div>
            <div className='h-1.5 w-full bg-muted/30 rounded-full overflow-hidden shadow-inner'>
                <div className={cn('h-full transition-all duration-1000 ease-in-out', color)} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}

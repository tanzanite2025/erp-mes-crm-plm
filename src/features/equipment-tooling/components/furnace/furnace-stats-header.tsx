'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, Zap, Activity, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

interface FurnaceStatsHeaderProps {
    stats: {
        total: number
        running: number
        maintenance: number
        fault: number
    }
}

/**
 * 炉台专属统计顶栏 - 承载原看板的分布逻辑
 */
export function FurnaceStatsHeader({ stats }: FurnaceStatsHeaderProps) {
    const { t } = useLanguage()

    return (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
            <Card className='rounded-[24px] border-dashed bg-primary border-primary/20 text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]'>
                <CardContent className='p-5 flex items-center gap-4'>
                    <div className='p-3 bg-white/20 rounded-2xl'>
                        <Cpu className='size-6' />
                    </div>
                    <div>
                        <p className='text-[10px] font-black uppercase tracking-widest opacity-80 italic'>{t('equipmentTooling.furnaces.stats.totalUnits')}</p>
                        <h3 className='text-3xl font-black font-mono tracking-tighter'>{stats.total}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
                <CardContent className='p-5 flex items-center gap-4'>
                    <Activity className='size-6 text-primary/60' />
                    <div>
                        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic'>{t('equipmentTooling.furnaces.stats.runningNow')}</p>
                        <div className='flex items-center gap-2'>
                            <h3 className='text-3xl font-black font-mono tracking-tighter text-primary'>{stats.running}</h3>
                            <Badge variant='outline' className='bg-background/50 border-primary/20 text-primary text-[8px] h-4 px-1.5 font-bold font-mono rounded-full animate-pulse'>
                                {t('equipmentTooling.furnaces.stats.live')}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
                <CardContent className='p-5 flex items-center gap-4'>
                    <Zap className='size-6 text-amber-500/60' />
                    <div>
                        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic'>{t('equipmentTooling.furnaces.stats.maintenance')}</p>
                        <h3 className='text-3xl font-black font-mono tracking-tighter text-amber-600'>{stats.maintenance}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card className='rounded-[24px] border-dashed border-rose-200/50 bg-rose-50/20 transition-all hover:bg-rose-50/40'>
                <CardContent className='p-5 flex items-center gap-4'>
                    <AlertTriangle className='size-6 text-rose-500/60' />
                    <div>
                        <p className='text-[10px] font-black uppercase tracking-widest text-rose-600 opacity-60 italic'>{t('equipmentTooling.furnaces.stats.faultAlert')}</p>
                        <h3 className='text-3xl font-black font-mono tracking-tighter text-rose-600'>{stats.fault}</h3>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

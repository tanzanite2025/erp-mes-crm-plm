'use client'

import { Activity, AlertTriangle, Cpu, Zap } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { FurnaceStats } from '../../data/furnace-stats'

export function FurnaceStatsHeader({ stats }: { stats: FurnaceStats }) {
  const { t } = useLanguage()

  return (
    <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
      <Card className='rounded-[24px] border-dashed border-primary/20 bg-primary text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]'>
        <CardContent className='flex items-center gap-4 p-5'>
          <div className='rounded-2xl bg-white/20 p-3'>
            <Cpu className='size-6' />
          </div>
          <div>
            <p className='text-[10px] font-black tracking-widest uppercase italic opacity-80'>
              {t('toolingFurnaces.stats.totalUnits')}
            </p>
            <h3 className='font-mono text-3xl font-black tracking-tighter'>
              {stats.total}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
        <CardContent className='flex items-center gap-4 p-5'>
          <Activity className='size-6 text-primary/60' />
          <div>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
              {t('toolingFurnaces.stats.runningNow')}
            </p>
            <div className='flex items-center gap-2'>
              <h3 className='font-mono text-3xl font-black tracking-tighter text-primary'>
                {stats.running}
              </h3>
              <Badge
                variant='outline'
                className='h-4 animate-pulse rounded-full border-primary/20 bg-background/50 px-1.5 font-mono text-[8px] font-bold text-primary'
              >
                {t('toolingFurnaces.stats.live')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
        <CardContent className='flex items-center gap-4 p-5'>
          <Zap className='size-6 text-amber-500/60' />
          <div>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
              {t('toolingFurnaces.stats.maintenance')}
            </p>
            <h3 className='font-mono text-3xl font-black tracking-tighter text-amber-600'>
              {stats.maintenance}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-rose-200/50 bg-rose-50/20 transition-all hover:bg-rose-50/40'>
        <CardContent className='flex items-center gap-4 p-5'>
          <AlertTriangle className='size-6 text-rose-500/60' />
          <div>
            <p className='text-[10px] font-black tracking-widest text-rose-600 uppercase italic opacity-60'>
              {t('toolingFurnaces.stats.faultAlert')}
            </p>
            <h3 className='font-mono text-3xl font-black tracking-tighter text-rose-600'>
              {stats.fault}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

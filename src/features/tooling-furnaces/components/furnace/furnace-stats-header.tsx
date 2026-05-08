'use client'

import { Activity, AlertTriangle, Cpu, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'

interface FurnaceStatsHeaderProps {
  stats: {
    total: number
    running: number
    maintenance: number
    fault: number
  }
}

export function FurnaceStatsHeader({ stats }: FurnaceStatsHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
      <Card className='rounded-[24px] border-dashed border-primary/20 bg-primary text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]'>
        <CardContent className='flex items-center gap-4 p-5'>
          <div className='rounded-2xl bg-white/20 p-3'>
            <Cpu className='size-6' />
          </div>
          <div>
            <p className='text-[10px] font-black uppercase tracking-widest opacity-80 italic'>
              {t('equipmentTooling.furnaces.stats.totalUnits')}
            </p>
            <h3 className='text-3xl font-black font-mono tracking-tighter'>{stats.total}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
        <CardContent className='flex items-center gap-4 p-5'>
          <Activity className='size-6 text-primary/60' />
          <div>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic'>
              {t('equipmentTooling.furnaces.stats.runningNow')}
            </p>
            <div className='flex items-center gap-2'>
              <h3 className='text-3xl font-black font-mono tracking-tighter text-primary'>{stats.running}</h3>
              <Badge
                variant='outline'
                className='h-4 rounded-full bg-background/50 px-1.5 text-[8px] font-bold font-mono text-primary border-primary/20 animate-pulse'
              >
                {t('equipmentTooling.furnaces.stats.live')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
        <CardContent className='flex items-center gap-4 p-5'>
          <Zap className='size-6 text-amber-500/60' />
          <div>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic'>
              {t('equipmentTooling.furnaces.stats.maintenance')}
            </p>
            <h3 className='text-3xl font-black font-mono tracking-tighter text-amber-600'>{stats.maintenance}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border-dashed border-rose-200/50 bg-rose-50/20 transition-all hover:bg-rose-50/40'>
        <CardContent className='flex items-center gap-4 p-5'>
          <AlertTriangle className='size-6 text-rose-500/60' />
          <div>
            <p className='text-[10px] font-black uppercase tracking-widest text-rose-600 opacity-60 italic'>
              {t('equipmentTooling.furnaces.stats.faultAlert')}
            </p>
            <h3 className='text-3xl font-black font-mono tracking-tighter text-rose-600'>{stats.fault}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

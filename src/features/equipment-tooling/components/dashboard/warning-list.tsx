'use client'

import { Ban } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { type Mold } from '../../data/schema'

interface WarningListProps {
  molds: Mold[]
}

export const WarningList = ({ molds }: WarningListProps) => {
  const { t } = useLanguage()
  const faultMolds = molds.filter((mold) => mold.status === 'RETIRED')

  if (faultMolds.length === 0) return null

  return (
    <Card className='overflow-hidden rounded-[24px] border-dashed border-rose-200 bg-rose-50/5 shadow-none dark:border-rose-900/50'>
      <div className='flex h-10 items-center gap-2 border-b border-dashed border-rose-100 bg-rose-500/5 px-4 dark:border-rose-900/30'>
        <Ban className='size-4 animate-pulse text-rose-600' />
        <span className='text-[10px] font-black tracking-widest text-rose-600 uppercase'>
          {t('equipmentTooling.dashboard.warnings.title')}
        </span>
      </div>
      <CardContent className='p-4'>
        <div className='space-y-2'>
          {faultMolds.map((mold) => (
            <div
              key={mold.id}
              className='flex items-center justify-between rounded-[16px] border border-dashed border-rose-200 bg-rose-500/5 px-4 py-3 text-[11px] dark:border-rose-900/30'
            >
              <div className='flex items-center gap-3'>
                <span className='font-mono text-[10px] font-bold text-rose-700/60'>
                  {mold.sn}
                </span>
                <span className='font-black text-rose-900/80'>{mold.name}</span>
              </div>
              <Badge
                variant='outline'
                className='h-5 rounded-full border-rose-500/20 bg-rose-500/10 text-[8px] font-black tracking-widest text-rose-600 uppercase'
              >
                {t('equipmentTooling.dashboard.warnings.retired')}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

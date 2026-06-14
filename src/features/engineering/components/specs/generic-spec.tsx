'use client'

import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { type Product } from '../../data/schema'

interface GenericSpecOverviewProps {
  product: Product
  categoryName?: string
}

export function GenericSpecOverview({
  categoryName,
}: GenericSpecOverviewProps) {
  const { t } = useLanguage()

  return (
    <div className='flex items-center gap-3 rounded-[20px] border border-dashed bg-muted/20 p-3 shadow-sm'>
      <div className='flex flex-1 flex-col items-stretch justify-around gap-3 px-1 sm:flex-row sm:items-center sm:gap-2'>
        <div className='flex min-h-[44px] flex-col justify-center gap-1'>
          <span className='text-[8px] font-black tracking-widest text-muted-foreground uppercase italic sm:text-[10px]'>
            {t('engineering.productMgmt.coreCategory')}
          </span>
          <span className='text-lg font-black text-foreground italic sm:text-xl'>
            {categoryName || '-'}
          </span>
        </div>
        <div className='hidden h-8 w-px bg-muted sm:block' />
        <div className='flex min-h-[44px] flex-col justify-center gap-1'>
          <span className='text-[8px] font-black tracking-widest text-muted-foreground uppercase italic sm:text-[10px]'>
            {t('engineering.productMgmt.estimatedWeight')}
          </span>
          <div className='flex items-baseline gap-1'>
            <span className='font-mono text-xl font-black text-foreground italic sm:text-2xl'>
              —
            </span>
            <span className='text-[10px] font-bold opacity-40'>BOM</span>
          </div>
        </div>
        <div className='hidden h-8 w-px bg-muted sm:block' />
        <div className='flex min-h-[52px] items-center gap-2 text-[10px] font-bold tracking-tighter text-muted-foreground/40 uppercase italic'>
          <Settings2 className='size-3' />
          {t('engineering.productMgmt.genericSpecMode')}
        </div>
      </div>
    </div>
  )
}

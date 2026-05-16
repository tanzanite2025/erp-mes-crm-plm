'use client'

import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { type Product } from '../../data/schema'

interface GenericSpecOverviewProps {
  product: Product
  categoryName?: string
}

export function GenericSpecOverview({ categoryName }: GenericSpecOverviewProps) {
  const { t } = useLanguage()

  return (
    <div className='flex items-center gap-3 p-3 rounded-[20px] bg-muted/20 border border-dashed shadow-sm'>
      <div className='flex-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-around gap-3 sm:gap-2 px-1'>
        <div className='flex min-h-[44px] flex-col justify-center gap-1'>
          <span className='text-[8px] sm:text-[10px] italic text-muted-foreground font-black uppercase tracking-widest'>
            {t('engineering.productMgmt.coreCategory')}
          </span>
          <span className='text-lg sm:text-xl font-black italic text-foreground'>
            {categoryName || '-'}
          </span>
        </div>
        <div className='hidden sm:block w-px h-8 bg-muted' />
        <div className='flex min-h-[44px] flex-col justify-center gap-1'>
          <span className='text-[8px] sm:text-[10px] italic text-muted-foreground font-black uppercase tracking-widest'>
            {t('engineering.productMgmt.estimatedWeight')}
          </span>
          <div className='flex items-baseline gap-1'>
            <span className='text-xl sm:text-2xl font-mono font-black italic text-foreground'>—</span>
            <span className='text-[10px] font-bold opacity-40'>BOM</span>
          </div>
        </div>
        <div className='hidden sm:block w-px h-8 bg-muted' />
        <div className='flex min-h-[52px] items-center gap-2 text-muted-foreground/40 italic text-[10px] font-bold uppercase tracking-tighter'>
          <Settings2 className='size-3' />
          {t('engineering.productMgmt.genericSpecMode')}
        </div>
      </div>
    </div>
  )
}

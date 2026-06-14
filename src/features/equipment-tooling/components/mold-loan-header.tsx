'use client'

import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function MoldLoanHeader() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
      <div className='flex items-center gap-2 text-primary'>
        <Truck className='size-4' />
        <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
          {t('equipmentTooling.loans.page.title')}
        </h3>
      </div>
      <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
        {t('equipmentTooling.loans.page.description')}
      </p>
    </div>
  )
}

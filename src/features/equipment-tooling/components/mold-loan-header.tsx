'use client'

import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function MoldLoanHeader() {
    const { t } = useLanguage()
    
    return (
        <div className='flex flex-col gap-1 bg-muted/5 p-5 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
            <div className='flex items-center gap-2 text-primary'>
                <Truck className='size-4' />
                <h3 className='text-base sm:text-lg font-black tracking-tighter italic uppercase'>
                    {t('equipmentTooling.loans.page.title')}
                </h3>
            </div>
            <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                {t('equipmentTooling.loans.page.description')}
            </p>
        </div>
    )
}

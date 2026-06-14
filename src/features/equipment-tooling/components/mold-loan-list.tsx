'use client'

import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { type MoldLoan } from '../data/schema'
import { MoldLoanCard } from './mold-loan-card'

interface MoldLoanListProps {
  loans: MoldLoan[]
  onReturn: (id: string) => void
}

export function MoldLoanList({ loans, onReturn }: MoldLoanListProps) {
  const { t } = useLanguage()

  if (loans.length === 0) {
    return (
      <Card className='rounded-[32px] border-dashed bg-muted/5'>
        <CardContent className='flex flex-col items-center gap-4 pt-16 pb-16'>
          <div className='flex size-20 items-center justify-center rounded-full bg-muted shadow-inner'>
            <Truck className='size-10 text-muted-foreground/20' />
          </div>
          <div className='space-y-1 text-center'>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
              {t('equipmentTooling.loans.empty.title')}
            </p>
            <p className='font-mono text-[8px] text-muted-foreground/20 italic'>
              {t('equipmentTooling.loans.empty.description')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='grid gap-6'>
      {loans.map((loan) => (
        <MoldLoanCard key={loan.id} loan={loan} onReturn={onReturn} />
      ))}
    </div>
  )
}

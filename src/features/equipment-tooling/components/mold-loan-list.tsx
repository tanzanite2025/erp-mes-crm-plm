'use client'

import { Truck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { MoldLoanCard } from './mold-loan-card'
import { type MoldLoan } from '../data/schema'

interface MoldLoanListProps {
    loans: MoldLoan[]
    onReturn: (id: string) => void
}

export function MoldLoanList({ loans, onReturn }: MoldLoanListProps) {
    const { t } = useLanguage()

    if (loans.length === 0) {
        return (
            <Card className='border-dashed bg-muted/5 rounded-[32px]'>
                <CardContent className='pt-16 pb-16 flex flex-col items-center gap-4'>
                    <div className='size-20 rounded-full bg-muted flex items-center justify-center shadow-inner'>
                        <Truck className='size-10 text-muted-foreground/20' />
                    </div>
                    <div className='text-center space-y-1'>
                        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                            {t('equipmentTooling.loans.empty.title')}
                        </p>
                        <p className='text-[8px] font-mono text-muted-foreground/20 italic'>
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

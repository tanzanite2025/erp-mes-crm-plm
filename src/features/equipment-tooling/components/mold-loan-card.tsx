'use client'

import {
  Clock,
  CheckCircle2,
  Truck,
  User,
  Factory,
  FileText,
  Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type MoldLoan } from '../data/schema'

interface MoldLoanCardProps {
  loan: MoldLoan
  onReturn: (id: string) => void
}

export function MoldLoanCard({ loan, onReturn }: MoldLoanCardProps) {
  const { t } = useLanguage()

  const getLoanStatusLabel = (loan: MoldLoan) => {
    if (loan.status === 'RETURNED')
      return t('equipmentTooling.loans.status.returned')
    if (loan.status === 'OVERDUE')
      return t('equipmentTooling.loans.status.overdue')
    if (loan.moldId.startsWith('borrow-mold-'))
      return t('equipmentTooling.loans.status.borrowed')
    return t('equipmentTooling.loans.status.lent')
  }

  const statusColor =
    loan.status === 'RETURNED'
      ? '#22c55e'
      : loan.status === 'OVERDUE'
        ? '#e11d48'
        : '#2563eb'

  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-[24px] border-l-8 border-dashed transition-all hover:shadow-2xl hover:shadow-primary/5',
        loan.status === 'OVERDUE' ? 'bg-rose-50/20' : 'bg-muted/5'
      )}
      style={{ borderLeftColor: statusColor }}
    >
      <CardContent className='p-0'>
        <div className='flex flex-col gap-6 p-5 sm:gap-8 sm:p-8 lg:flex-row'>
          <div className='flex-1 space-y-6'>
            <div className='flex flex-wrap items-center gap-3 sm:gap-4'>
              <div className='rounded border border-dashed border-muted-foreground/20 bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-black uppercase'>
                {loan.moldSn}
              </div>
              <h3 className='truncate text-base font-black tracking-tighter sm:text-xl'>
                {loan.moldName}
              </h3>
              <Badge
                variant='outline'
                className={cn(
                  'h-4 rounded-full border-none text-[8px] font-black uppercase',
                  loan.status === 'RETURNED' &&
                    'bg-emerald-500/10 text-emerald-600',
                  loan.status === 'OVERDUE' &&
                    'animate-pulse bg-rose-500/10 text-rose-600',
                  loan.status === 'ACTIVE' &&
                    (loan.moldId.startsWith('borrow-mold-')
                      ? 'bg-purple-500/10 text-purple-600'
                      : 'bg-blue-500/10 text-blue-600')
                )}
              >
                {getLoanStatusLabel(loan)}
              </Badge>
            </div>

            {loan.photoUrl && (
              <div className='xs:flex-row xs:items-center flex flex-col gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/40 p-3'>
                <div className='size-16 shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-sm sm:size-20'>
                  <img
                    src={loan.photoUrl}
                    alt={t('equipmentTooling.loans.card.photoTitle')}
                    className='h-full w-full object-cover'
                  />
                </div>
                <div className='space-y-1'>
                  <p className='flex items-center gap-1.5 text-[9px] font-black tracking-widest text-blue-600 uppercase'>
                    <Camera className='size-3.5' />{' '}
                    {t('equipmentTooling.loans.card.photoTitle')}
                  </p>
                  <p className='max-w-[320px] text-[8px] leading-tight font-bold text-muted-foreground/60 uppercase'>
                    {t('equipmentTooling.loans.card.photoDescription')}
                  </p>
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <Factory className='size-3' />{' '}
                  {t('equipmentTooling.loans.card.path')}
                </div>
                <div className='flex items-center gap-3'>
                  <span className='max-w-[80px] truncate text-xs font-black sm:text-sm'>
                    {loan.fromFactory}
                  </span>
                  <Truck className='size-3 text-muted-foreground/30' />
                  <span className='max-w-[80px] truncate text-xs font-black text-blue-600 sm:text-sm'>
                    {loan.toFactory}
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <User className='size-3' />{' '}
                  {t('equipmentTooling.loans.card.agent')}
                </div>
                <p className='text-xs font-black sm:text-sm'>
                  {loan.contactPerson || '-'}
                </p>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <Clock className='size-3' />{' '}
                  {t('equipmentTooling.loans.card.cycle')}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-[10px] font-bold'>
                    {new Date(loan.loanDate).toLocaleDateString()}
                  </span>
                  <span className='font-black text-muted-foreground/20 italic'>
                    -
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold',
                      loan.status === 'OVERDUE' && 'text-rose-600 underline'
                    )}
                  >
                    {new Date(loan.expectedReturnDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='mt-2 flex flex-row justify-center border-t border-dashed border-slate-100 pt-6 lg:mt-0 lg:flex-col lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8'>
            {loan.status === 'ACTIVE' ? (
              <Button
                variant='outline'
                className='h-11 w-full gap-2 rounded-full border-dashed border-emerald-200 px-6 text-[10px] font-black tracking-widest text-emerald-600 uppercase shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95'
                onClick={() => onReturn(loan.id)}
              >
                <CheckCircle2 className='size-4' />
                {t('equipmentTooling.loans.actions.return')}
              </Button>
            ) : (
              loan.actualReturnDate && (
                <div className='w-full space-y-1 text-right lg:text-left'>
                  <p className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    {t('equipmentTooling.loans.card.returnDate')}
                  </p>
                  <p className='text-base font-black tracking-tighter text-emerald-600 italic sm:text-lg'>
                    {new Date(loan.actualReturnDate).toLocaleDateString()}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
        {loan.remarks && (
          <div className='flex items-center gap-3 border-t border-dashed border-slate-100 bg-muted/20 px-5 py-3 text-[9px] font-black text-muted-foreground sm:px-8'>
            <FileText className='size-3 opacity-50' />
            <span className='tracking-widest uppercase opacity-30'>
              {t('equipmentTooling.loans.card.memo')}
            </span>
            {loan.remarks}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

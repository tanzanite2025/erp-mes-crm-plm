import { CalendarDays, FileStack, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'

type SalesReturnActualAmountSummaryCardProps = {
  record: SalesReturnRecord
}

export function SalesReturnActualAmountSummaryCard({
  record,
}: SalesReturnActualAmountSummaryCardProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 md:col-span-2'>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/70 uppercase'>
            <FileStack className='size-3.5' />
            {t('trading.salesReturns.queryShell.actualAmount')}
          </div>
          <p className='text-sm font-black text-primary'>
            {record.actualReturnAmountRecordedAt
              ? `¥ ${record.actualReturnAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : t('trading.salesReturns.queryShell.actualAmountEmpty')}
          </p>
        </div>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <FileStack className='size-3.5' />
            {t('trading.salesReturns.createSheet.estimatedAmount')}
          </div>
          <p className='text-sm font-black text-foreground'>
            ¥{' '}
            {record.totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <CalendarDays className='size-3.5' />
            {t('trading.salesReturns.queryShell.actualAmountRecordedAt')}
          </div>
          <p className='text-xs font-black text-foreground'>
            {record.actualReturnAmountRecordedAt
              ? record.actualReturnAmountRecordedAt
                  .replace('T', ' ')
                  .slice(0, 16)
              : '--'}
          </p>
        </div>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <User className='size-3.5' />
            {t('trading.salesReturns.queryShell.actualAmountRecordedBy')}
          </div>
          <p className='text-xs font-black text-foreground'>
            {record.actualReturnAmountRecordedBy?.trim() || '--'}
          </p>
        </div>
      </div>
    </div>
  )
}

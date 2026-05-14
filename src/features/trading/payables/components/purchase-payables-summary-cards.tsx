import { useLanguage } from '@/context/language-provider'
import type { PayableSummary } from '../adapters/payable-api-adapter'

interface PurchasePayablesSummaryCardsProps {
  summary: PayableSummary | undefined
}

export function PurchasePayablesSummaryCards({ summary }: PurchasePayablesSummaryCardsProps) {
  const { t } = useLanguage()

  return (
    <div className='grid gap-2 md:grid-cols-3'>
      <div className='flex items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5'>
        <span className='text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400'>
          {t('purchase.payables.summaryTotal')}
        </span>
        <span className='text-base font-black italic tabular-nums text-blue-700 dark:text-blue-300'>
          {summary?.totalPayable ?? 0}
        </span>
      </div>

      <div className='flex items-center justify-between rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5'>
        <span className='text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400'>
          {t('purchase.payables.summaryOverdue')}
        </span>
        <span className='text-base font-black italic tabular-nums text-rose-700 dark:text-rose-300'>
          {summary?.overduePayable ?? 0}
        </span>
      </div>

      <div className='flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5'>
        <span className='text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400'>
          {t('purchase.payables.summaryPending')}
        </span>
        <span className='text-base font-black italic tabular-nums text-amber-700 dark:text-amber-300'>
          {summary?.pendingPaymentCount ?? 0}
        </span>
      </div>
    </div>
  )
}

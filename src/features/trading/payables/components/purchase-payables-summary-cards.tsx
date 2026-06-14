import { useLanguage } from '@/context/language-provider'
import type { PayableSummary } from '../adapters/payable-api-adapter'

interface PurchasePayablesSummaryCardsProps {
  summary: PayableSummary | undefined
}

export function PurchasePayablesSummaryCards({
  summary,
}: PurchasePayablesSummaryCardsProps) {
  const { t } = useLanguage()

  return (
    <div className='grid gap-2 md:grid-cols-3'>
      <div className='flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-950/30'>
        <span className='text-[10px] font-black tracking-widest text-blue-600 uppercase dark:text-blue-400'>
          {t('purchase.payables.summaryTotal')}
        </span>
        <span className='text-base font-black text-blue-700 italic tabular-nums dark:text-blue-300'>
          {summary?.totalPayable ?? 0}
        </span>
      </div>

      <div className='flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 dark:border-rose-800 dark:bg-rose-950/30'>
        <span className='text-[10px] font-black tracking-widest text-rose-600 uppercase dark:text-rose-400'>
          {t('purchase.payables.summaryOverdue')}
        </span>
        <span className='text-base font-black text-rose-700 italic tabular-nums dark:text-rose-300'>
          {summary?.overduePayable ?? 0}
        </span>
      </div>

      <div className='flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-800 dark:bg-amber-950/30'>
        <span className='text-[10px] font-black tracking-widest text-amber-600 uppercase dark:text-amber-400'>
          {t('purchase.payables.summaryPending')}
        </span>
        <span className='text-base font-black text-amber-700 italic tabular-nums dark:text-amber-300'>
          {summary?.pendingPaymentCount ?? 0}
        </span>
      </div>
    </div>
  )
}

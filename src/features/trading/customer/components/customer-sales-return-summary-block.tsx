import { RotateCcw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { CustomerSalesReturnSummary } from '../services/customer-sales-return-summary-service'

type CustomerSalesReturnSummaryBlockProps = {
  summary?: CustomerSalesReturnSummary
  onOpenSalesReturns: () => void
  compact?: boolean
}

export function CustomerSalesReturnSummaryBlock({
  summary,
  onOpenSalesReturns,
  compact = false,
}: CustomerSalesReturnSummaryBlockProps) {
  const { t } = useLanguage()
  const hasRealSummary = typeof summary?.totalOrders === 'number'
  const returnedOrderCount = summary?.returnedOrderCount ?? 0
  const effectiveOrderCount = summary?.effectiveOrderCount ?? 0
  const canceledOrderCount = summary?.canceledOrderCount ?? 0
  const hasOnlyCanceledOrders = hasRealSummary && effectiveOrderCount === 0 && canceledOrderCount > 0

  return (
    <div
      className={
        compact
          ? 'space-y-2'
          : 'space-y-2 border-t border-dashed border-muted/50 pt-2'
      }
    >
      <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
        <RotateCcw className='size-3' />
        {t('trading.customers.summary.returnTitle')}
      </div>

      <div
        className={
          compact
            ? 'rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5'
            : 'rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-3'
        }
      >
        <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black text-foreground'>
              <ShieldAlert className='size-3.5 text-amber-600' />
              {t('trading.customers.summary.returnMetricTitle')}
            </div>
            <div className='flex items-end gap-2'>
              <span className='text-[16px] font-black tracking-tight text-foreground italic tabular-nums'>
                {hasRealSummary
                  ? `${returnedOrderCount.toLocaleString()} / ${effectiveOrderCount.toLocaleString()}`
                  : '-- / --'}
              </span>
              <span className='pb-0.5 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {hasOnlyCanceledOrders
                  ? t('trading.customers.summary.noEffectiveOrders')
                  : hasRealSummary
                    ? t('trading.customers.summary.ready')
                    : t('trading.customers.summary.pending')}
              </span>
            </div>
            <p className='text-[10px] leading-5 font-bold text-muted-foreground'>
              {hasRealSummary
                ? t('trading.customers.summary.returnReadyDescription', {
                    returnedQuantity: summary?.returnedQuantity.toLocaleString() ?? 0,
                    returnedOrderCount: returnedOrderCount.toLocaleString(),
                    effectiveOrderCount: effectiveOrderCount.toLocaleString(),
                    canceledOrderCount: canceledOrderCount.toLocaleString(),
                  })
                : t('trading.customers.summary.returnPendingDescription')}
            </p>
          </div>

          <div className='flex flex-col items-start gap-2 sm:w-[136px] sm:justify-self-end sm:items-end'>
            <span className='inline-flex w-fit items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[8px] font-black tracking-widest text-amber-700 uppercase'>
              {hasOnlyCanceledOrders
                ? t('trading.customers.summary.returnVoidedOnlyBadge')
                : hasRealSummary
                  ? t('trading.customers.summary.returnReadyBadge')
                  : t('trading.customers.summary.returnPendingBadge')}
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onOpenSalesReturns}
              className='h-9 w-full rounded-full px-4 text-[9px] font-black tracking-widest uppercase'
            >
              {t('trading.customers.summary.returnAction')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

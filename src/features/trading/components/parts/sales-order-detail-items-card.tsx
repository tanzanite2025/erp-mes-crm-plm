import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { isSalesOrderStatusEligibleForProduction } from '../../data/sales-order-production-source-eligibility'
import type { SalesOrder } from '../../data/schema'
import { useSalesOrderClaimButtonViewModel } from '../../hooks/use-sales-order-claim-button-view-model'
import { useSalesOrderDetailLineRows } from '../../hooks/use-sales-order-detail-line-rows'
import { useSalesOrderDetailViewModel } from '../../hooks/use-sales-order-detail-view-model'
import { SalesOrderDetailLineCard } from './sales-order-detail-line-card'

interface SalesOrderDetailItemsCardProps {
  order: SalesOrder
  isClaimAction: boolean
  claimOperator: string
  onClaimModel: (model: string) => void
  onClaimLine: (lineNo: number) => void
  onPreview: (
    productId: string | undefined,
    planId: string | undefined,
    type: 'spec' | 'drilling' | 'labeling'
  ) => void
}

export function SalesOrderDetailItemsCard({
  order,
  isClaimAction,
  claimOperator,
  onClaimModel,
  onClaimLine,
  onPreview,
}: SalesOrderDetailItemsCardProps) {
  const { t } = useLanguage()
  const { claimableModels } = useSalesOrderDetailViewModel(order)
  const lineRows = useSalesOrderDetailLineRows(order)
  const { className: claimButtonClassName } =
    useSalesOrderClaimButtonViewModel(isClaimAction)
  const hasClaimActions =
    isSalesOrderStatusEligibleForProduction(order.status) &&
    claimableModels.length > 0

  return (
    <section className='@container min-w-0 space-y-2'>
      <div className='flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-start'>
        <h2 className='shrink-0 text-base leading-7 font-semibold'>
          {t('tradingSalesOrder.detail.itemsTitle')}
        </h2>
        {hasClaimActions && (
          <div className='flex min-w-0 flex-wrap gap-2 sm:justify-end'>
            {claimableModels.map((model) => (
              <Button
                key={model}
                type='button'
                variant='outline'
                size='sm'
                className={cn(
                  claimButtonClassName,
                  'h-auto min-w-0 py-1.5 leading-6 [overflow-wrap:anywhere] whitespace-normal'
                )}
                onClick={() => onClaimModel(model)}
              >
                {t('tradingSalesOrder.detail.claimModel')}: {model}
              </Button>
            ))}
          </div>
        )}
      </div>
      {lineRows.length > 0 ? (
        <ol className='space-y-2'>
          {lineRows.map((row) => (
            <SalesOrderDetailLineCard
              key={row.key}
              row={row}
              canClaimLine={
                isSalesOrderStatusEligibleForProduction(order.status) &&
                !row.line.claimedBy
              }
              claimOperator={claimOperator}
              onClaimLine={onClaimLine}
              onPreview={onPreview}
            />
          ))}
        </ol>
      ) : (
        <p className='rounded-xl border border-dashed border-border bg-card px-4 py-4 text-center text-sm text-muted-foreground'>
          {t('tradingSalesOrder.detail.noExecutionData')}
        </p>
      )}
    </section>
  )
}

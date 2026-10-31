import { FileCheck, Printer, Settings2, XCircle } from 'lucide-react'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type SalesOrder } from '../../data/schema'
import type { SalesOrderStatusCommandPayload } from '../../hooks/use-sales-order-detail-actions'
import { useSalesOrderDetailHeaderActions } from '../../hooks/use-sales-order-detail-header-actions'
import { useSalesOrderDetailHeaderViewModel } from '../../hooks/use-sales-order-detail-header-view-model'
import { SalesOrderStatusBadge } from './sales-order-status-badge'

interface SalesOrderDetailHeaderProps {
  order: SalesOrder
  isClaimAction: boolean
  activeCommandTitle?: string
  activeCommandContent?: string
  onMutateStatus: (payload: SalesOrderStatusCommandPayload) => void
  onPrint: () => void
}

export function SalesOrderDetailHeader({
  order,
  isClaimAction,
  activeCommandTitle,
  activeCommandContent,
  onMutateStatus,
  onPrint,
}: SalesOrderDetailHeaderProps) {
  const { t } = useLanguage()
  const { handlePrint, printLabel } = useSalesOrderDetailHeaderActions({
    printLabel: t('tradingSalesOrder.print.printOrder'),
    onPrint,
  })
  const {
    showClaimBanner,
    commandTitle,
    canSubmitPending,
    canCancel,
    submitPendingPayload,
    cancelPayload,
    cancelConfirmText,
  } = useSalesOrderDetailHeaderViewModel({
    order,
    isClaimAction,
    activeCommandTitle,
    t,
  })

  return (
    <header className='min-w-0 space-y-2'>
      <div className='flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1'>
          <div className='flex min-w-0 flex-wrap items-center gap-3'>
            <h2 className='text-lg leading-7 font-semibold tracking-tight [overflow-wrap:anywhere]'>
              {order.orderNo}
            </h2>
            <SalesOrderStatusBadge status={order.status} />
          </div>
          <p className='text-sm leading-6 [overflow-wrap:anywhere]'>
            <span className='mr-2 text-muted-foreground'>
              {t('tradingSalesOrder.detail.info.customerName')}
            </span>
            {order.customerName || '—'}
          </p>
        </div>
        <div className='flex min-w-0 flex-wrap items-center gap-2 lg:max-w-2xl lg:justify-end'>
          {canSubmitPending && (
            <Button
              size='sm'
              className='min-h-9 gap-2 rounded-lg px-3 text-sm font-medium'
              onClick={() => onMutateStatus(submitPendingPayload)}
            >
              <FileCheck className='size-3.5' />
              {t('tradingSalesOrder.detail.submitPending')}
            </Button>
          )}
          {canCancel && (
            <Button
              size='sm'
              variant='ghost'
              className='min-h-9 gap-2 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10'
              onClick={async () => {
                if (!(await requestApplicationConfirmation(cancelConfirmText)))
                  return
                onMutateStatus(cancelPayload)
              }}
            >
              <XCircle className='size-3.5' />
              {t('tradingSalesOrder.detail.cancelOrder')}
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            className='min-h-9 gap-2 rounded-lg px-3 text-sm font-medium'
            onClick={handlePrint}
          >
            <Printer className='size-3.5' />
            {printLabel}
          </Button>
        </div>
      </div>

      {showClaimBanner && (
        <div className='space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3'>
          <div className='flex items-start gap-2'>
            <Settings2 className='mt-1 size-4 shrink-0 text-primary' />
            <span className='text-sm leading-6 font-medium text-primary'>
              {t('tradingSalesOrder.detail.pendingInstruction')}: {commandTitle}
            </span>
          </div>
          <p className='text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground'>
            {activeCommandContent}
          </p>
        </div>
      )}
    </header>
  )
}

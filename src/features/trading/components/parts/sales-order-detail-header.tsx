import { CheckCircle, FileCheck, Play, Printer, Settings2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderDetailHeaderActions } from '../../hooks/use-sales-order-detail-header-actions'
import { useSalesOrderDetailHeaderViewModel } from '../../hooks/use-sales-order-detail-header-view-model'
import { SalesOrderStatusBadge } from './sales-order-status-badge'

interface SalesOrderDetailHeaderProps {
  order: SalesOrder
  isClaimAction: boolean
  activeCommandTitle?: string
  activeCommandContent?: string
  onMutateStatus: (payload: Partial<SalesOrder>) => void
}

export function SalesOrderDetailHeader({
  order,
  isClaimAction,
  activeCommandTitle,
  activeCommandContent,
  onMutateStatus,
}: SalesOrderDetailHeaderProps) {
  const { t } = useLanguage()
  const { handlePrint, printLabel } = useSalesOrderDetailHeaderActions({
    printLabel: t('tradingSalesOrder.print.printShipment'),
    printPendingMessage: t('tradingSalesOrder.print.templatePending'),
  })
  const {
    showClaimBanner,
    commandTitle,
    canSubmitPending,
    canStartProduction,
    canMarkDone,
    canCancel,
    submitPendingPayload,
    startProductionPayload,
    markDonePayload,
    cancelPayload,
    cancelConfirmText,
  } = useSalesOrderDetailHeaderViewModel({
    order,
    isClaimAction,
    activeCommandTitle,
    t,
  })

  return (
    <div className='relative overflow-hidden rounded-[32px] border border-dashed border-primary/20 bg-muted/5 px-6 py-4 shadow-inner backdrop-blur-md'>
      <div className='absolute left-0 top-0 h-full w-1.5 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' />
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none'>
            {t('tradingSalesOrder.detail.businessOrderId')}
          </p>
          <div className='flex items-center gap-3'>
            <h3 className='text-[22px] font-black uppercase tracking-tighter italic leading-none'>
              {order.orderNo}
            </h3>
            <SalesOrderStatusBadge status={order.status} />
          </div>
        </div>
        <div className='space-y-1 border-r-2 border-dashed border-primary/10 pr-6 text-right'>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none'>
            {t('tradingSalesOrder.detail.clientEntity')}
          </p>
          <p className='text-[14px] font-black tracking-tight text-foreground leading-none'>
            {order.customerName}
          </p>
        </div>
      </div>

      {showClaimBanner && (
        <div className='mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-2 animate-in slide-in-from-top-1'>
          <div className='flex items-center gap-2 px-1'>
            <Settings2 className='size-3 animate-spin-slow text-primary' />
            <span className='text-[10px] font-black uppercase tracking-wider text-primary'>
              {t('tradingSalesOrder.detail.pendingInstruction')}: {commandTitle}
            </span>
          </div>
          <p className='text-[9px] font-bold italic text-muted-foreground'>{activeCommandContent}</p>
        </div>
      )}

      <div className='mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-muted-foreground/10 pt-2'>
        {canSubmitPending && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-amber-500 text-[10px] font-black uppercase text-white hover:bg-amber-600'
            onClick={() => onMutateStatus(submitPendingPayload)}
          >
            <FileCheck className='size-3.5' />
            {t('tradingSalesOrder.detail.submitPending')}
          </Button>
        )}
        {canStartProduction && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-primary text-[10px] font-black uppercase text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
            onClick={() => onMutateStatus(startProductionPayload)}
          >
            <Play className='size-3.5' />
            {t('tradingSalesOrder.detail.startProduction')}
          </Button>
        )}
        {canMarkDone && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-emerald-500 text-[10px] font-black uppercase text-white hover:bg-emerald-600'
            onClick={() => onMutateStatus(markDonePayload)}
          >
            <CheckCircle className='size-3.5' />
            {t('tradingSalesOrder.detail.markDone')}
          </Button>
        )}
        {canCancel && (
          <Button
            size='sm'
            variant='ghost'
            className='gap-1.5 rounded-xl text-[10px] font-black uppercase text-destructive hover:bg-destructive/10'
            onClick={() => {
              if (!confirm(cancelConfirmText)) return
              onMutateStatus(cancelPayload)
            }}
          >
            <XCircle className='size-3.5' />
            {t('tradingSalesOrder.detail.cancelOrder')}
          </Button>
        )}
        <div className='flex-1' />
        <Button
          size='sm'
          variant='outline'
          className='gap-1.5 rounded-xl border-2 border-dashed text-[10px] font-black uppercase'
          onClick={handlePrint}
        >
          <Printer className='size-3.5' />
          {printLabel}
        </Button>
      </div>
    </div>
  )
}

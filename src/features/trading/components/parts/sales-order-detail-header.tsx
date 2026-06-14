import {
  CalendarClock,
  CheckCircle,
  FileCheck,
  Play,
  Printer,
  Settings2,
  XCircle,
} from 'lucide-react'
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
    canStartScheduling,
    canStartProduction,
    canMarkDone,
    canCancel,
    submitPendingPayload,
    startSchedulingPayload,
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
    <div className='relative overflow-hidden rounded-xl border border-dashed border-primary/15 bg-muted/5 px-4 py-2 shadow-inner backdrop-blur-md'>
      <div className='absolute top-0 left-0 h-full w-1 bg-primary/80' />
      <div className='flex flex-wrap items-center gap-2 pl-2'>
        <h3 className='text-[18px] leading-none font-black tracking-tight uppercase'>
          {order.orderNo}
        </h3>
        <SalesOrderStatusBadge status={order.status} />
        <div className='mx-1 h-4 border-l border-dashed border-muted-foreground/20' />
        <div className='min-w-0 flex-1 truncate text-[13px] font-black tracking-tight text-foreground'>
          {order.customerName}
        </div>
        {canSubmitPending && (
          <Button
            size='sm'
            className='h-7 gap-1.5 rounded-lg bg-amber-500 px-2 text-[10px] font-black text-white uppercase hover:bg-amber-600'
            onClick={() => onMutateStatus(submitPendingPayload)}
          >
            <FileCheck className='size-3.5' />
            {t('tradingSalesOrder.detail.submitPending')}
          </Button>
        )}
        {canStartScheduling && (
          <Button
            size='sm'
            className='h-7 gap-1.5 rounded-lg bg-violet-500 px-2 text-[10px] font-black text-white uppercase shadow-lg shadow-violet-500/20 hover:bg-violet-600'
            onClick={() => onMutateStatus(startSchedulingPayload)}
          >
            <CalendarClock className='size-3.5' />
            {t('tradingSalesOrder.detail.startScheduling')}
          </Button>
        )}
        {canStartProduction && (
          <Button
            size='sm'
            className='h-7 gap-1.5 rounded-lg bg-primary px-2 text-[10px] font-black text-white uppercase shadow-lg shadow-primary/20 hover:bg-primary/90'
            onClick={() => onMutateStatus(startProductionPayload)}
          >
            <Play className='size-3.5' />
            {t('tradingSalesOrder.detail.startProduction')}
          </Button>
        )}
        {canMarkDone && (
          <Button
            size='sm'
            className='h-7 gap-1.5 rounded-lg bg-emerald-500 px-2 text-[10px] font-black text-white uppercase hover:bg-emerald-600'
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
            className='h-7 gap-1.5 rounded-lg px-2 text-[10px] font-black text-destructive uppercase hover:bg-destructive/10'
            onClick={() => {
              if (!confirm(cancelConfirmText)) return
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
          className='h-7 gap-1.5 rounded-lg border border-dashed px-2 text-[10px] font-black uppercase'
          onClick={handlePrint}
        >
          <Printer className='size-3.5' />
          {printLabel}
        </Button>
      </div>

      {showClaimBanner && (
        <div className='mt-1.5 flex animate-in items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 slide-in-from-top-1'>
          <div className='flex items-center gap-1.5'>
            <Settings2 className='animate-spin-slow size-3 text-primary' />
            <span className='text-[10px] font-black tracking-wide text-primary uppercase'>
              {t('tradingSalesOrder.detail.pendingInstruction')}: {commandTitle}
            </span>
          </div>
          <p className='text-[10px] font-bold text-muted-foreground'>
            {activeCommandContent}
          </p>
        </div>
      )}
    </div>
  )
}

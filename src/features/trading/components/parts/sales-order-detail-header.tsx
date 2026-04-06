import { CheckCircle, FileCheck, Play, Printer, Settings2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'
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

      {isClaimAction && order.status === 'Pending' && (
        <div className='mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-2 animate-in slide-in-from-top-1'>
          <div className='flex items-center gap-2 px-1'>
            <Settings2 className='size-3 animate-spin-slow text-primary' />
            <span className='text-[10px] font-black uppercase tracking-wider text-primary'>
              {t('tradingSalesOrder.detail.pendingInstruction')}:{' '}
              {activeCommandTitle || t('tradingSalesOrder.detail.claimFallback')}
            </span>
          </div>
          <p className='text-[9px] font-bold italic text-muted-foreground'>{activeCommandContent}</p>
        </div>
      )}

      <div className='mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-muted-foreground/10 pt-2'>
        {order.status === 'Draft' && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-amber-500 text-[10px] font-black uppercase text-white hover:bg-amber-600'
            onClick={() => onMutateStatus({ id: order.id, status: 'Pending' })}
          >
            <FileCheck className='size-3.5' />
            {t('tradingSalesOrder.detail.submitPending')}
          </Button>
        )}
        {order.status === 'Pending' && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-primary text-[10px] font-black uppercase text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
            onClick={() =>
              onMutateStatus({
                id: order.id,
                status: 'InProgress',
                statusNote: t('tradingSalesOrder.detail.productionTriggered'),
              })
            }
          >
            <Play className='size-3.5' />
            {t('tradingSalesOrder.detail.startProduction')}
          </Button>
        )}
        {order.status === 'InProgress' && (
          <Button
            size='sm'
            className='gap-1.5 rounded-xl bg-emerald-500 text-[10px] font-black uppercase text-white hover:bg-emerald-600'
            onClick={() => onMutateStatus({ id: order.id, status: 'Done' })}
          >
            <CheckCircle className='size-3.5' />
            {t('tradingSalesOrder.detail.markDone')}
          </Button>
        )}
        {['Draft', 'Pending'].includes(order.status) && (
          <Button
            size='sm'
            variant='ghost'
            className='gap-1.5 rounded-xl text-[10px] font-black uppercase text-destructive hover:bg-destructive/10'
            onClick={() => {
              if (!confirm(t('tradingSalesOrder.detail.cancelConfirm'))) return
              onMutateStatus({ id: order.id, status: 'Canceled' })
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
          onClick={() => toast.info(t('tradingSalesOrder.print.templatePending'))}
        >
          <Printer className='size-3.5' />
          {t('tradingSalesOrder.print.printShipment')}
        </Button>
      </div>
    </div>
  )
}

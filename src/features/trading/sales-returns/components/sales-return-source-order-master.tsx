import { CalendarDays, FileStack, Package2, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrder } from '@/features/trading/data/schema'

type SalesReturnSourceOrderMasterProps = {
  orders: SalesOrder[]
  selectedId?: string
  onSelect: (id: string) => void
  onStartReturn: (order: SalesOrder) => void
}

function canCreateReturn(order: SalesOrder) {
  if (!order.availableActions || order.availableActions.length === 0) {
    return false
  }

  return order.availableActions.some(
    (item) => item.action === 'createReturn' && item.allowed
  )
}

export function SalesReturnSourceOrderMaster({
  orders,
  selectedId,
  onSelect,
  onStartReturn,
}: SalesReturnSourceOrderMasterProps) {
  const { t } = useLanguage()

  if (orders.length === 0) {
    return (
      <div className='rounded-[28px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>
          {t('trading.salesReturns.entryShell.sourceEmptyTitle')}
        </p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          {t('trading.salesReturns.entryShell.sourceEmptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {orders.map((order) => {
        const isSelected = order.id === selectedId
        const statusMeta = getSalesStatusMeta(order.status)
        const isReturnAllowed = canCreateReturn(order)

        return (
          <Card
            key={order.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelect(order.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(order.id)
              }
            }}
            className={`cursor-pointer rounded-[24px] border-dashed px-4 py-4 shadow-none transition-all ${
              isSelected
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                : 'border-muted/50 bg-background/80 hover:bg-muted/20'
            }`}
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-black tracking-tight text-foreground'>
                  {order.orderNo}
                </p>
                <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {order.orderName || '--'}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusMeta.color}`}
              >
                {getSalesStatusLabel(order.status, t)}
              </span>
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <User className='size-3.5' />
                  {t('trading.salesReturns.entryShell.customer')}
                </div>
                <p className='text-xs font-black text-foreground'>
                  {order.customerName}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  {t('trading.salesReturns.entryShell.sourceQuantity')}
                </div>
                <p className='text-xs font-black text-foreground'>
                  {order.quantity.toLocaleString()} PCS
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <CalendarDays className='size-3.5' />
                  {t('trading.salesReturns.entryShell.sourceOrderDate')}
                </div>
                <p className='text-xs font-black text-foreground'>
                  {order.orderDate}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <FileStack className='size-3.5' />
                  {t('trading.salesReturns.entryShell.sourceStatus')}
                </div>
                <p className='text-xs font-black text-foreground'>
                  {getSalesStatusLabel(order.status, t)}
                </p>
              </div>
            </div>

            <div className='mt-4 flex justify-end'>
              <Button
                type='button'
                size='sm'
                disabled={!isReturnAllowed}
                className='rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
                onClick={(event) => {
                  event.stopPropagation()
                  if (!isReturnAllowed) return
                  onStartReturn(order)
                }}
              >
                {t('trading.salesReturns.entryShell.sourceAction')}
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

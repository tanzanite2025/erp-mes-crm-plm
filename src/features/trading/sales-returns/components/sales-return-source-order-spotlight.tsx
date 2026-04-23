import { CalendarDays, FileStack, Package2, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrder } from '@/features/trading/data/schema'

type SalesReturnSourceOrderSpotlightProps = {
  order?: SalesOrder
  isLoading: boolean
  onClearSelection: () => void
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

export function SalesReturnSourceOrderSpotlight({
  order,
  isLoading,
  onClearSelection,
  onStartReturn,
}: SalesReturnSourceOrderSpotlightProps) {
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
        <CardContent className='px-5 py-8 text-center text-sm font-bold text-muted-foreground'>
          {t('common.actions.loading')}
        </CardContent>
      </Card>
    )
  }

  if (!order) {
    return null
  }

  const statusMeta = getSalesStatusMeta(order.status)
  const isReturnAllowed = canCreateReturn(order)

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 px-5 py-4'>
        <div>
          <CardTitle className='text-base font-black tracking-tight text-foreground'>
            {t('trading.salesReturns.entryShell.sourceSelectionTitle')}
          </CardTitle>
          <p className='mt-1 text-xs font-bold text-muted-foreground'>
            {order.orderNo}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            size='sm'
            disabled={!isReturnAllowed}
            onClick={() => {
              if (!isReturnAllowed) return
              onStartReturn(order)
            }}
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
          >
            {t('trading.salesReturns.entryShell.sourceAction')}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onClearSelection}
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
          >
            {t('trading.salesReturns.queryShell.clearSelection')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <User className='size-3.5' />
            {t('trading.salesReturns.queryShell.customer')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {order.customerName}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Package2 className='size-3.5' />
            {t('trading.salesReturns.queryShell.quantity')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {order.quantity?.toLocaleString() || 0} PCS
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <CalendarDays className='size-3.5' />
            {t('trading.salesReturns.queryShell.orderDate')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {order.orderDate}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <FileStack className='size-3.5' />
            {t('trading.salesReturns.queryShell.status')}
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusMeta.color}`}
          >
            {getSalesStatusLabel(order.status, t)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

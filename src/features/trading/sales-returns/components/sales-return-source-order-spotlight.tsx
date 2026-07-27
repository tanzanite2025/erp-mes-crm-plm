import { useState } from 'react'
import { CalendarDays, FileStack, Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrder } from '@/features/trading/data/schema'
import type { SalesReturnCreateInitialValues } from './sales-return-create-sheet'

type SalesReturnSourceOrderSpotlightProps = {
  order?: SalesOrder
  isLoading: boolean
  onClearSelection: () => void
  onStartReturn: (
    order: SalesOrder,
    initialValues?: SalesReturnCreateInitialValues
  ) => void
}

function canCreateReturn(order: SalesOrder) {
  if (!order.availableActions || order.availableActions.length === 0) {
    return false
  }

  return order.availableActions.some(
    (item) => item.action === 'createReturn' && item.allowed
  )
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

export function SalesReturnSourceOrderSpotlight({
  order,
  isLoading,
  onClearSelection,
  onStartReturn,
}: SalesReturnSourceOrderSpotlightProps) {
  const { t } = useLanguage()
  const [returnDate, setReturnDate] = useState(todayValue())
  const [trackingNo, setTrackingNo] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  const [logisticsNote, setLogisticsNote] = useState('')

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
        <div className='min-w-0'>
          <CardTitle className='text-base font-black tracking-tight text-foreground'>
            退货执行信息
          </CardTitle>
          <div className='mt-1 flex flex-wrap items-center gap-2'>
            <p className='truncate text-xs font-bold text-muted-foreground'>
              {order.orderNo}
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusMeta.color}`}
            >
              {getSalesStatusLabel(order.status, t)}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
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
      <CardContent className='space-y-4 px-5 pb-5'>
        <div className='rounded-[20px] border border-dashed border-border/70 bg-background/70 p-3'>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            来源订单
          </p>
          <p className='mt-1 text-sm font-black text-foreground'>
            {order.customerName} / {order.quantity?.toLocaleString() || 0} PCS
          </p>
        </div>

        <div className='grid gap-3'>
          <div className='space-y-1.5'>
            <label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              <CalendarDays className='size-3.5' />
              {t('trading.salesReturns.createSheet.returnDate')}
            </label>
            <Input
              type='date'
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              className='h-10 rounded-2xl bg-background'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              <Truck className='size-3.5' />
              {t('trading.salesReturns.createSheet.trackingNo')}
            </label>
            <Input
              value={trackingNo}
              onChange={(event) => setTrackingNo(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.trackingNoPlaceholder'
              )}
              className='h-10 rounded-2xl bg-background'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              <Truck className='size-3.5' />
              {t('trading.salesReturns.createSheet.carrier')}
            </label>
            <Input
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.carrierPlaceholder'
              )}
              className='h-10 rounded-2xl bg-background'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              <CalendarDays className='size-3.5' />
              {t('trading.salesReturns.createSheet.shippedAt')}
            </label>
            <Input
              type='datetime-local'
              value={shippedAt}
              onChange={(event) => setShippedAt(event.target.value)}
              className='h-10 rounded-2xl bg-background'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              <FileStack className='size-3.5' />
              {t('trading.salesReturns.createSheet.logisticsNote')}
            </label>
            <Textarea
              value={logisticsNote}
              onChange={(event) => setLogisticsNote(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.logisticsNotePlaceholder'
              )}
              rows={3}
              className='rounded-2xl bg-background'
            />
          </div>
        </div>

        <Button
          type='button'
          disabled={!isReturnAllowed}
          onClick={() => {
            if (!isReturnAllowed) return
            onStartReturn(order, {
              returnDate,
              trackingNo,
              carrier,
              shippedAt,
              logisticsNote,
            })
          }}
          className='h-10 w-full rounded-full text-[10px] font-black tracking-widest uppercase'
        >
          {t('trading.salesReturns.entryShell.sourceAction')}
        </Button>
      </CardContent>
    </Card>
  )
}

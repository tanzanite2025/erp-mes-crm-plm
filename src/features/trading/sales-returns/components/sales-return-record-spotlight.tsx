import { CalendarDays, FileStack, Package2, Truck, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesReturnLogisticsPanel } from './sales-return-logistics-panel'

function getSalesReturnStatusLabel(
  status: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (status) {
    case 'Created':
      return t('trading.salesReturns.statuses.Created')
    case 'InTransit':
      return t('trading.salesReturns.statuses.InTransit')
    case 'Received':
      return t('trading.salesReturns.statuses.Received')
    case 'Closed':
      return t('trading.salesReturns.statuses.Closed')
    case 'Canceled':
      return t('trading.salesReturns.statuses.Canceled')
    default:
      return status
  }
}

function getSalesReturnTransportModeLabel(
  mode: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (mode) {
    case 'Courier':
      return t('trading.salesReturns.transportModes.Courier')
    case 'Other':
      return t('trading.salesReturns.transportModes.Other')
    default:
      return mode
  }
}

type SalesReturnRecordSpotlightProps = {
  record?: SalesReturnRecord
  isLoading: boolean
  onClearSelection: () => void
}

export function SalesReturnRecordSpotlight({
  record,
  isLoading,
  onClearSelection,
}: SalesReturnRecordSpotlightProps) {
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

  if (!record) {
    return (
      <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
        <CardContent className='px-5 py-8 text-center'>
          <p className='text-sm font-black text-foreground'>
            {t('trading.salesReturns.queryShell.noSelectionTitle')}
          </p>
          <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
            {t('trading.salesReturns.queryShell.noSelectionDescription')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 px-5 py-4'>
        <div>
          <CardTitle className='text-base font-black tracking-tight text-foreground'>
            {t('trading.salesReturns.queryShell.selectionTitle')}
          </CardTitle>
          <p className='mt-1 text-xs font-bold text-muted-foreground'>
            {record.returnNo}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClearSelection}
          className='rounded-full text-[10px] font-black tracking-widest uppercase'
        >
          {t('trading.salesReturns.queryShell.clearSelection')}
        </Button>
      </CardHeader>
      <CardContent className='space-y-4 px-5 pb-5'>
        <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <User className='size-3.5' />
            {t('trading.salesReturns.queryShell.customer')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.customerName}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Package2 className='size-3.5' />
            {t('trading.salesReturns.queryShell.quantity')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.totalQuantity.toLocaleString()} PCS
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <CalendarDays className='size-3.5' />
            {t('trading.salesReturns.queryShell.returnDate')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.returnDate.slice(0, 10)}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <FileStack className='size-3.5' />
            {t('trading.salesReturns.queryShell.status')}
          </div>
          <span className='inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 uppercase'>
            {getSalesReturnStatusLabel(record.status, t)}
          </span>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Truck className='size-3.5' />
            {t('trading.salesReturns.queryShell.transportMode')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {getSalesReturnTransportModeLabel(record.transportMode, t)}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Truck className='size-3.5' />
            {t('trading.salesReturns.queryShell.trackingNo')}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-black text-foreground'>
              {record.trackingNo?.trim() || '--'}
            </p>
            {record.pendingTrackingFill ? (
              <span className='inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 uppercase'>
                {t('trading.salesReturns.queryShell.pendingTrackingBadge')}
              </span>
            ) : null}
          </div>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Truck className='size-3.5' />
            {t('trading.salesReturns.queryShell.carrier')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.carrier?.trim() || '--'}
          </p>
        </div>

        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <CalendarDays className='size-3.5' />
            {t('trading.salesReturns.queryShell.shippedAt')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.shippedAt ? record.shippedAt.replace('T', ' ').slice(0, 16) : '--'}
          </p>
        </div>

        <div className='space-y-1 md:col-span-2'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <FileStack className='size-3.5' />
            {t('trading.salesReturns.queryShell.reason')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.reason?.trim() ||
              t('trading.salesReturns.queryShell.emptyReason')}
          </p>
        </div>

        <div className='space-y-1 md:col-span-2'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Truck className='size-3.5' />
            {t('trading.salesReturns.queryShell.logisticsNote')}
          </div>
          <p className='text-sm font-black text-foreground'>
            {record.logisticsNote?.trim() || '--'}
          </p>
        </div>
        </div>

        <SalesReturnLogisticsPanel
          key={`${record.id}-${record.updatedAt}`}
          record={record}
        />
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'

const salesReturnStatusOptions = [
  'Created',
  'InTransit',
  'Received',
  'Closed',
  'Canceled',
] as const

const salesReturnTransportModeOptions = ['Courier', 'Other'] as const

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneAdjusted = new Date(
    date.getTime() - date.getTimezoneOffset() * 60 * 1000
  )
  return timezoneAdjusted.toISOString().slice(0, 16)
}

function toIsoDateTimeValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return new Date(trimmed).toISOString()
}

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

type SalesReturnLogisticsPanelProps = {
  record: SalesReturnRecord
}

export function SalesReturnLogisticsPanel({
  record,
}: SalesReturnLogisticsPanelProps) {
  const { t } = useLanguage()
  const { patchLogisticsMutation } = useSalesReturnMutations()
  const [transportMode, setTransportMode] = useState(record.transportMode)
  const [trackingNo, setTrackingNo] = useState(record.trackingNo ?? '')
  const [carrier, setCarrier] = useState(record.carrier ?? '')
  const [shippedAt, setShippedAt] = useState(
    toDateTimeLocalValue(record.shippedAt)
  )
  const [logisticsNote, setLogisticsNote] = useState(record.logisticsNote ?? '')
  const [status, setStatus] = useState(record.status)

  const handleSubmit = () => {
    patchLogisticsMutation.mutate({
      salesReturnId: record.id,
      payload: {
        transportMode,
        trackingNo: trackingNo.trim() || undefined,
        carrier: carrier.trim() || undefined,
        shippedAt: toIsoDateTimeValue(shippedAt),
        logisticsNote: logisticsNote.trim() || undefined,
        status,
      },
    })
  }

  return (
    <div className='rounded-[24px] border border-dashed border-border/70 bg-background/80 p-4 shadow-sm'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-black text-foreground'>
            {t('trading.salesReturns.queryShell.logisticsSectionTitle')}
          </p>
          <p className='mt-1 text-xs leading-6 font-bold text-muted-foreground'>
            {t('trading.salesReturns.queryShell.logisticsSectionDescription')}
          </p>
        </div>
        {record.pendingTrackingFill ? (
          <span className='inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 uppercase'>
            {t('trading.salesReturns.queryShell.pendingTrackingBadge')}
          </span>
        ) : null}
      </div>

      <div className='mt-4 grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.transportMode')}
          </label>
          <Select
            value={transportMode}
            onValueChange={(value) => setTransportMode(value as typeof transportMode)}
          >
            <SelectTrigger className='h-11 rounded-2xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {salesReturnTransportModeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {getSalesReturnTransportModeLabel(option, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.status')}
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className='h-11 rounded-2xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {salesReturnStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {getSalesReturnStatusLabel(option, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.trackingNo')}
          </label>
          <Input
            value={trackingNo}
            onChange={(event) => setTrackingNo(event.target.value)}
            placeholder={t('trading.salesReturns.createSheet.trackingNoPlaceholder')}
          />
        </div>

        <div className='space-y-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.carrier')}
          </label>
          <Input
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            placeholder={t('trading.salesReturns.createSheet.carrierPlaceholder')}
          />
        </div>

        <div className='space-y-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.shippedAt')}
          </label>
          <Input
            type='datetime-local'
            value={shippedAt}
            onChange={(event) => setShippedAt(event.target.value)}
            className='h-11 rounded-2xl'
          />
        </div>

        <div className='space-y-2 rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-4'>
          <div className='grid gap-2 text-xs font-bold text-muted-foreground'>
            <div className='flex items-center justify-between gap-4'>
              <span>{t('trading.salesReturns.queryShell.trackingFilledAt')}</span>
              <span className='text-right text-foreground'>
                {record.trackingFilledAt
                  ? record.trackingFilledAt.replace('T', ' ').slice(0, 16)
                  : '--'}
              </span>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <span>{t('trading.salesReturns.queryShell.trackingFilledBy')}</span>
              <span className='text-right text-foreground'>
                {record.trackingFilledBy?.trim() || '--'}
              </span>
            </div>
          </div>
        </div>

        <div className='space-y-2 md:col-span-2'>
          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('trading.salesReturns.queryShell.logisticsNote')}
          </label>
          <Textarea
            value={logisticsNote}
            onChange={(event) => setLogisticsNote(event.target.value)}
            placeholder={t('trading.salesReturns.createSheet.logisticsNotePlaceholder')}
            rows={3}
          />
        </div>
      </div>

      <div className='mt-4 flex justify-end'>
        <Button
          type='button'
          onClick={handleSubmit}
          disabled={patchLogisticsMutation.isPending}
        >
          {patchLogisticsMutation.isPending
            ? t('common.actions.loading')
            : t('trading.salesReturns.queryShell.updateLogistics')}
        </Button>
      </div>
    </div>
  )
}

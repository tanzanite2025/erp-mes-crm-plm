import { AlertCircle, CalendarClock, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import type { CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'
import { getCustomerSalesClosureMetrics } from '../utils/customer-sales-closure-metrics'

interface CustomerSalesClosureSummaryProps {
  summary?: CustomerSalesClosureSummary
}

function getCustomerSalesStatusLabel(
  code: string,
  t: ReturnType<typeof useLanguage>['t']
): string {
  switch (code.trim().toLowerCase()) {
    case 'draft':
      return t('trading.customers.summary.statusDraft')
    case 'pending':
      return t('trading.customers.summary.statusPending')
    case 'scheduling':
      return t('trading.customers.summary.statusScheduling')
    case 'inprogress':
    case 'in_progress':
      return t('trading.customers.summary.statusInProgress')
    case 'done':
      return t('trading.customers.summary.statusDone')
    case 'canceled':
    case 'cancelled':
      return t('trading.customers.summary.statusCanceled')
    default:
      return t('trading.customers.summary.statusUnknown', {
        status: code.trim() || '-',
      })
  }
}

function getPrimaryStatusBadgeClass(
  phase: string,
  hasOnlyCanceledOrders: boolean
): string {
  if (hasOnlyCanceledOrders || phase.trim().toLowerCase() === 'cancelled') {
    return 'border-slate-500/20 bg-slate-500/10 text-[8px] font-black text-slate-600 uppercase'
  }
  if (phase.trim().toLowerCase() === 'done') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-[8px] font-black text-emerald-600 uppercase'
  }
  return 'border-amber-500/20 bg-amber-500/10 text-[8px] font-black text-amber-600 uppercase'
}

export function CustomerSalesClosureSummaryBlock({
  summary,
}: CustomerSalesClosureSummaryProps) {
  const { t } = useLanguage()
  const metrics = getCustomerSalesClosureMetrics(summary)
  const hasOrderHistory = Boolean(summary?.lastOrderDate)

  const SummaryIcon =
    metrics.hasOnlyCanceledOrders ||
    (metrics.hasEffectiveOrderHistory && !metrics.areAllEffectiveOrdersDone)
      ? AlertCircle
      : CheckCircle2
  const primaryStatusLabel = metrics.primaryStatusCode
    ? getCustomerSalesStatusLabel(metrics.primaryStatusCode, t)
    : ''
  const effectiveOrdersLabel = metrics.hasEffectiveOrderHistory
    ? t('trading.customers.summary.effectiveOrdersValue', {
        count: metrics.effectiveOrderCount,
      })
    : metrics.hasOnlyCanceledOrders
      ? t('trading.customers.summary.noEffectiveOrders')
      : t('trading.customers.summary.noOrders')
  const statusBreakdown = metrics.effectiveStatusCounts
    .map((item) =>
      t('trading.customers.summary.statusCountItem', {
        status: getCustomerSalesStatusLabel(item.code, t),
        count: item.count,
      })
    )
    .join(' / ')
  const summaryDescription = metrics.hasEffectiveOrderHistory
    ? metrics.effectiveOrderCount === 1 && primaryStatusLabel
      ? t('trading.customers.summary.currentStatusValue', {
          status: primaryStatusLabel,
        })
      : t('trading.customers.summary.statusBreakdownValue', {
          summary: statusBreakdown || primaryStatusLabel,
        })
    : metrics.hasOnlyCanceledOrders
      ? t('trading.customers.summary.canceledOrdersValue', {
          count: metrics.canceledOrderCount,
        })
      : t('trading.customers.summary.noOrders')

  return (
    <div className='grid grid-cols-1 gap-3 rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5 md:grid-cols-3 md:items-center'>
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <SummaryIcon className='size-3' />
          {t('trading.customers.summary.orderStatusTitle')}
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-[14px] font-black tracking-tight text-foreground tabular-nums md:text-[16px]'>
            {effectiveOrdersLabel}
          </span>
          {metrics.hasEffectiveOrderHistory || metrics.hasOnlyCanceledOrders ? (
            <Badge
              variant='outline'
              className={getPrimaryStatusBadgeClass(
                metrics.primaryStatusPhase,
                metrics.hasOnlyCanceledOrders
              )}
            >
              {metrics.hasOnlyCanceledOrders
                ? t('trading.customers.summary.onlyCanceledOrders')
                : primaryStatusLabel}
            </Badge>
          ) : null}
          {metrics.hasEffectiveOrderHistory &&
          metrics.canceledOrderCount > 0 ? (
            <Badge
              variant='outline'
              className='border-slate-500/20 bg-slate-500/10 text-[8px] font-black text-slate-600 uppercase'
            >
              {t('trading.customers.summary.canceledOrdersValue', {
                count: metrics.canceledOrderCount,
              })}
            </Badge>
          ) : null}
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
          {summaryDescription}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-2 md:contents'>
        <div className='min-w-0 space-y-1'>
          <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
            <CalendarClock className='size-3' />
            {t('trading.customers.summary.lastOrderDate')}
          </div>
          <p className='truncate text-[11px] font-black text-foreground md:text-[12px]'>
            {hasOrderHistory
              ? summary?.lastOrderDate
              : t('trading.customers.summary.noOrders')}
          </p>
        </div>

        <div className='min-w-0 space-y-1'>
          <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
            <CalendarClock className='size-3' />
            {t('trading.customers.summary.idleDays')}
          </div>
          <p className='truncate text-[11px] font-black text-foreground md:text-[12px]'>
            {typeof summary?.daysSinceLastOrder === 'number'
              ? t('trading.customers.summary.idleDaysValue', {
                  count: summary.daysSinceLastOrder,
                })
              : t('trading.customers.summary.noOrders')}
          </p>
        </div>
      </div>
    </div>
  )
}

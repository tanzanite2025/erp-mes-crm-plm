import { AlertCircle, CalendarClock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import type { CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'
import { getCustomerSalesClosureMetrics } from '../utils/customer-sales-closure-metrics'

interface CustomerSalesClosureSummaryProps {
  summary?: CustomerSalesClosureSummary
}

export function CustomerSalesClosureSummaryBlock({
  summary,
}: CustomerSalesClosureSummaryProps) {
  const { t } = useLanguage()
  const metrics = getCustomerSalesClosureMetrics(summary)
  const hasOrderHistory = Boolean(summary?.lastOrderDate)

  return (
    <div className='grid grid-cols-1 gap-3 rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5 md:grid-cols-3 md:items-center'>
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          {metrics.openOrderCount > 0 ? (
            <AlertCircle className='size-3' />
          ) : (
            <CheckCircle2 className='size-3' />
          )}
          {t('trading.customers.summary.orderStatusTitle')}
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-[14px] font-black tracking-tight text-foreground tabular-nums md:text-[16px]'>
            {metrics.closureRatioLabel}
          </span>
          <Badge
            variant='outline'
            className={
              metrics.openOrderCount > 0
                ? 'border-amber-500/20 bg-amber-500/10 text-[8px] font-black text-amber-600 uppercase'
                : 'border-emerald-500/20 bg-emerald-500/10 text-[8px] font-black text-emerald-600 uppercase'
            }
          >
            {metrics.closureStatusLabel}
          </Badge>
        </div>
      </div>

      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <CalendarClock className='size-3' />
          {t('trading.customers.summary.lastOrderDate')}
        </div>
        <p className='text-[11px] font-black text-foreground md:text-[12px]'>
          {hasOrderHistory ? summary?.lastOrderDate : t('trading.customers.summary.noOrders')}
        </p>
      </div>

      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <CalendarClock className='size-3' />
          {t('trading.customers.summary.idleDays')}
        </div>
        <p className='text-[11px] font-black text-foreground md:text-[12px]'>
          {typeof summary?.daysSinceLastOrder === 'number'
            ? t('trading.customers.summary.idleDaysValue', { count: summary.daysSinceLastOrder })
            : t('trading.customers.summary.noOrders')}
        </p>
      </div>
    </div>
  )
}

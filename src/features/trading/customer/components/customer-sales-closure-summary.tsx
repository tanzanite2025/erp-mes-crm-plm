import { AlertCircle, CalendarClock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'
import { getCustomerSalesClosureMetrics } from '../utils/customer-sales-closure-metrics'

interface CustomerSalesClosureSummaryProps {
  summary?: CustomerSalesClosureSummary
}

export function CustomerSalesClosureSummaryBlock({ summary }: CustomerSalesClosureSummaryProps) {
  const metrics = getCustomerSalesClosureMetrics(summary)
  const hasOrderHistory = Boolean(summary?.lastOrderDate)

  return (
    <div className='grid grid-cols-1 gap-3 rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5 md:grid-cols-3 md:items-center'>
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          {metrics.openOrderCount > 0 ? <AlertCircle className='size-3' /> : <CheckCircle2 className='size-3' />}
          订单闭环
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-[14px] md:text-[16px] font-black tracking-tight text-foreground tabular-nums'>
            {metrics.closureRatioLabel}
          </span>
          <Badge
            variant='outline'
            className={metrics.openOrderCount > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[8px] font-black uppercase' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] font-black uppercase'}
          >
            {metrics.closureStatusLabel}
          </Badge>
        </div>
      </div>

      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <CalendarClock className='size-3' />
          最后下单
        </div>
        <p className='text-[11px] md:text-[12px] font-black text-foreground'>
          {hasOrderHistory ? summary?.lastOrderDate : '暂无订单'}
        </p>
      </div>

      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <CalendarClock className='size-3' />
          沉默时长
        </div>
        <p className='text-[11px] md:text-[12px] font-black text-foreground'>
          {typeof summary?.daysSinceLastOrder === 'number' ? `${summary.daysSinceLastOrder} 天` : '暂无订单'}
        </p>
      </div>
    </div>
  )
}

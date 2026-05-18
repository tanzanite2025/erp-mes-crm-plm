import { useEffect } from 'react'
import { ExternalLink, Loader2, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../../data/schema'
import type { SalesOrderAfterSalesCardViewModel } from '../../utils/sales-order-after-sales-card-view-model'

interface SalesOrderAfterSalesCardProps {
  order: SalesOrder
  viewModel: SalesOrderAfterSalesCardViewModel
  readonly?: boolean
  onOpenReturns: (order: SalesOrder) => void
  onOpenExchanges: (order: SalesOrder) => void
}

const stateMeta = {
  empty: {
    icon: ShieldCheck,
    title: '无售后',
    hint: '当前订单暂无退货或换货记录',
    badgeClassName: 'bg-muted/40 text-muted-foreground',
    surfaceClassName: 'border-muted/40 bg-background/80',
  },
  healthy: {
    icon: ShieldCheck,
    title: '已闭环',
    hint: '售后记录均已完成闭环',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600',
    surfaceClassName: 'border-emerald-500/20 bg-emerald-500/5',
  },
  alert: {
    icon: TriangleAlert,
    title: '处理中',
    hint: '存在进行中的退货或换货记录',
    badgeClassName: 'bg-amber-500/10 text-amber-600',
    surfaceClassName: 'border-amber-500/20 bg-amber-500/5',
  },
  critical: {
    icon: TriangleAlert,
    title: '待处理',
    hint: '存在待补物流或待收旧件事项',
    badgeClassName: 'bg-rose-500/10 text-rose-600 animate-pulse',
    surfaceClassName: 'border-rose-500/20 bg-rose-500/5',
  },
} as const

function formatAmount(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function MetricBlock({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className='rounded-2xl bg-background/80 px-2.5 py-1.5 ring-1 ring-muted/40'>
      <div className='flex items-center justify-between gap-2'>
        <div className='min-w-0 truncate text-[8px] font-black tracking-widest text-muted-foreground/55'>
          {label}
        </div>
        <div className={cn('shrink-0 text-[11px] font-black tracking-tighter', tone)}>{value}</div>
      </div>
    </div>
  )
}

export function SalesOrderAfterSalesCard({
  order,
  viewModel,
  readonly = false,
  onOpenReturns,
  onOpenExchanges,
}: SalesOrderAfterSalesCardProps) {
  const meta = stateMeta[viewModel.state]
  const Icon = meta.icon
  const returns = viewModel.returns
  const exchanges = viewModel.exchanges

  useEffect(() => {
    if (viewModel.isError && viewModel.error) {
      failLoudly(viewModel.error, 'SalesOrderAfterSalesCard')
    }
  }, [viewModel.error, viewModel.isError])

  return (
    <div
      className={cn(
        'relative flex h-full overflow-hidden rounded-[24px] border border-dashed p-3 transition-colors',
        meta.surfaceClassName
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
      <div className='relative flex h-full flex-1 flex-col gap-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <Icon className='size-4 text-primary' />
              <h3 className='text-sm font-black tracking-tighter italic'>退换货售后</h3>
            </div>
          </div>
          <div
            className={cn(
              'rounded-full px-2 py-1 text-[8px] font-mono font-black uppercase',
              meta.badgeClassName
            )}
          >
            {viewModel.isLoading ? '同步中' : meta.title}
          </div>
        </div>

        {viewModel.isLoading ? (
          <div className='flex h-14 items-center justify-center rounded-2xl bg-background/70'>
            <Loader2 className='size-4 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-1.5'>
            <MetricBlock label='退货' value={returns.count} />
            <MetricBlock label='换货' value={exchanges.count} />
            <MetricBlock
              label='处理中'
              value={viewModel.openCount}
              tone={viewModel.openCount > 0 ? 'text-amber-600' : undefined}
            />
            <MetricBlock label='金额' value={`¥${formatAmount(returns.totalAmount)}`} />
          </div>
        )}

        <div className='mt-auto grid grid-cols-2 gap-1.5'>
          <Button
            type='button'
            variant='secondary'
            className='h-8 rounded-full text-[10px] font-black tracking-widest uppercase'
            disabled={readonly}
            onClick={() => onOpenReturns(order)}
          >
            <RotateCcw className='size-3' />
            退货
            <ExternalLink className='size-3 opacity-50' />
          </Button>
          <Button
            type='button'
            variant='secondary'
            className='h-8 rounded-full text-[10px] font-black tracking-widest uppercase'
            disabled={readonly}
            onClick={() => onOpenExchanges(order)}
          >
            <RefreshCw className='size-3' />
            换货
            <ExternalLink className='size-3 opacity-50' />
          </Button>
        </div>
      </div>
    </div>
  )
}
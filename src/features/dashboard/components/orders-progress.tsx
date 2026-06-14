import { useState, useEffect } from 'react'
import {
  PackageSearch,
  Activity,
  Zap,
  TriangleAlert,
  Compass,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { BlueprintLab } from '@/features/labs/blueprint'
import {
  ProductionCalendarService,
  type OrderProgress,
} from '@/features/production-calendar/services/production-calendar-service'

type OrdersLoadErrorReason =
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'server'
  | 'invalidResponse'
  | 'unknown'

function resolveOrdersLoadErrorReason(error: unknown): OrdersLoadErrorReason {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (status === 401) return 'unauthorized'
    if (status === 403) return 'forbidden'
    if (status >= 500) return 'server'
  }

  if (error instanceof Error) {
    if (
      error.message.includes('[TIMEOUT]') ||
      error.message.includes('Failed to fetch')
    ) {
      return 'network'
    }
    if (error.message.includes('[INVALID_RESPONSE]')) {
      return 'invalidResponse'
    }
  }

  return 'unknown'
}

export function OrdersProgress() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<OrderProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [errorReason, setErrorReason] = useState<OrdersLoadErrorReason | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderProgress | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setErrorReason(null)
        setErrorMessage(null)
        const data = await ProductionCalendarService.getOrderProgress()
        setOrders(data)
      } catch (error) {
        setOrders([])
        setErrorReason(resolveOrdersLoadErrorReason(error))
        if (error instanceof Error) {
          setErrorMessage(error.message)
        }
      } finally {
        setLoading(false)
      }
    }
    void loadOrders()

    const handleSync = () => {
      void loadOrders()
    }
    window.addEventListener('xdfc_production_plans_updated', handleSync)
    return () =>
      window.removeEventListener('xdfc_production_plans_updated', handleSync)
  }, [])

  if (loading) {
    return (
      <div className='flex animate-pulse flex-col gap-6'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-32 rounded-[32px] bg-muted/20' />
        ))}
      </div>
    )
  }

  if (errorReason) {
    if (errorReason === 'forbidden') {
      return <ForbiddenState />
    }

    return (
      <div className='flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-rose-200 bg-rose-50/40 py-20 text-rose-700'>
        <TriangleAlert className='mb-4 size-12 opacity-80' />
        <p className='text-[10px] font-black tracking-[0.3em] uppercase italic'>
          {t('dashboard.page.reports.error.title')}
        </p>
        <p className='mt-2 max-w-md px-6 text-center text-[11px]'>
          {t('dashboard.page.reports.error.description')}
        </p>
        <p className='mt-4 text-[10px] font-semibold tracking-wide'>
          {t('dashboard.page.reports.error.reasonPrefix')}
          {t(`dashboard.page.reports.error.reasons.${errorReason}`)}
        </p>
        {errorMessage && (
          <div className='mt-6 w-full max-w-xl rounded-xl border border-rose-100 bg-white/50 p-4'>
            <p className='font-mono text-[9px] leading-relaxed break-all text-rose-900'>
              [STACK_TRACE]: {errorMessage}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-muted/20 bg-muted/5 py-20 text-muted-foreground'>
        <PackageSearch className='mb-4 size-12 animate-pulse opacity-10' />
        <p className='text-[10px] font-black tracking-[0.3em] uppercase italic'>
          {t('dashboard.page.reports.empty.title')}
        </p>
        <p className='mt-2 text-[9px] tracking-widest uppercase opacity-40'>
          {t('dashboard.page.reports.empty.description')}
        </p>
      </div>
    )
  }

  // 动态拟合瓶颈延迟小时数
  const bottleneckData = orders.slice(0, 5).map((order) => {
    const gap = Math.max(0, order.target - (order.completed + order.wip))
    const delayValue = Math.max(6, Math.round(gap * 0.18 + order.wip * 0.05))
    return {
      name: `批次 #${order.orderNo}`,
      delay: delayValue,
    }
  })

  return (
    <div className='animate-in duration-700 fade-in'>
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <div className='grid grid-cols-1 gap-3.5 lg:grid-cols-12'>
          {/* Left Column: Order Delivery Lists (col-span-7) */}
          <div className='flex flex-col gap-3 lg:col-span-7'>
            {orders.map((order) => {
              const target = Math.max(1, order.target)
              const completedPct = Math.min(
                100,
                (order.completed / target) * 100
              )
              const wipPct = Math.min(
                100 - completedPct,
                (order.wip / target) * 100
              )
              const gap = Math.max(
                0,
                order.target - (order.completed + order.wip)
              )
              const isCritical = gap > order.target * 0.3

              return (
                <DialogTrigger asChild key={order.id}>
                  <Card
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-[24px] border border-dashed border-muted/30 transition-all duration-500 hover:scale-[1.005] hover:shadow-lg',
                      isCritical
                        ? 'bg-rose-500/2 hover:bg-white'
                        : 'bg-background/60 hover:bg-white'
                    )}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />

                    {/* Status Edge Indicator */}
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 left-0 w-1',
                        gap === 0
                          ? 'bg-emerald-500'
                          : isCritical
                            ? 'animate-pulse bg-rose-500'
                            : 'bg-blue-500'
                      )}
                    />

                    <CardContent className='relative z-10 p-3.5'>
                      <div className='flex flex-col gap-4'>
                        {/* Header Info */}
                        <div className='flex items-center justify-between gap-4'>
                          <div className='flex min-w-0 flex-col gap-0.5'>
                            <div className='flex items-center gap-2'>
                              <span className='shrink-0 font-mono text-[7px] leading-none font-black tracking-widest text-muted-foreground/30 uppercase md:text-[8px]'>
                                {t('dashboard.page.reports.labels.batch')}
                              </span>
                              <span className='shrink truncate text-[9px] font-black text-primary/40 italic'>
                                #{order.orderNo}
                              </span>
                            </div>
                            <h3 className='max-w-[140px] truncate text-xs font-black tracking-tighter text-secondary uppercase italic transition-colors group-hover:text-primary md:max-w-[200px] md:text-sm'>
                              {order.customer}
                            </h3>
                          </div>
                          <div className='flex shrink-0 flex-col items-end gap-0.5'>
                            <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                              {t('dashboard.page.reports.labels.target')}
                            </span>
                            <div className='flex items-center gap-1.5'>
                              <Zap
                                className={cn(
                                  'size-3',
                                  isCritical ? 'text-rose-500' : 'text-blue-500'
                                )}
                              />
                              <span className='text-base font-black tracking-tighter italic tabular-nums md:text-lg'>
                                {order.target}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Advanced Progress Bar */}
                        <div className='space-y-2'>
                          <div className='flex h-2.5 w-full overflow-hidden rounded-full border border-muted/10 bg-muted/20 p-0.5 shadow-inner'>
                            <div
                              className='rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out'
                              style={{ width: `${completedPct}%` }}
                            />
                            <div
                              className='rounded-full bg-blue-500/40 transition-all duration-1000 ease-out'
                              style={{ width: `${wipPct}%` }}
                            />
                          </div>

                          {/* Detailed Metrics */}
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4 md:gap-6'>
                              <div className='flex flex-col gap-0.5'>
                                <span className='text-[7px] leading-none font-black tracking-widest text-muted-foreground/30 uppercase'>
                                  {t('dashboard.page.reports.labels.real')}
                                </span>
                                <span className='text-[10px] font-black text-emerald-600 tabular-nums'>
                                  {order.completed}
                                </span>
                              </div>
                              <div className='flex flex-col gap-0.5'>
                                <span className='text-[7px] leading-none font-black tracking-widest text-muted-foreground/30 uppercase'>
                                  {t('dashboard.page.reports.labels.wip')}
                                </span>
                                <div className='flex items-center gap-1'>
                                  <span className='animate-pulse text-[10px] font-black text-blue-500 tabular-nums'>
                                    {order.wip}
                                  </span>
                                  <Activity className='size-2.5 text-blue-400' />
                                </div>
                              </div>
                            </div>
                            <div className='flex flex-col items-end gap-0.5'>
                              <span className='text-[7px] leading-none font-black tracking-widest text-muted-foreground/30 uppercase'>
                                {t('dashboard.page.reports.labels.gap')}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] font-black italic tabular-nums',
                                  gap > 0 ? 'text-rose-500' : 'text-emerald-500'
                                )}
                              >
                                {gap === 0
                                  ? t('dashboard.page.reports.labels.done')
                                  : `-${gap}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
              )
            })}
          </div>

          {/* Right Column: Delay Bottleneck Diagnosis Chart (col-span-5) */}
          <div className='flex flex-col gap-3.5 lg:col-span-5'>
            <Card className='relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-dashed border-muted/30 bg-muted/5 p-4 shadow-none'>
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
              <div>
                <CardHeader className='z-10 border-b border-dashed border-muted/30 p-0 pb-3'>
                  <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight text-rose-500 uppercase italic'>
                    <Compass className='animate-spin-slow size-4' />
                    交付排产延时瓶颈诊断
                  </CardTitle>
                  <CardDescription className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    PRODUCTION_DELAY_BOTTLENECK / 交付缺口与流转阻塞分析
                  </CardDescription>
                </CardHeader>
                <CardContent className='relative z-10 h-[280px] p-0 pt-6'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={bottleneckData}
                      layout='vertical'
                      margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray='3 3'
                        horizontal={false}
                        stroke='#e2e8f0'
                      />
                      <XAxis
                        type='number'
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: '8px', fontFamily: 'monospace' }}
                      />
                      <YAxis
                        dataKey='name'
                        type='category'
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: '8px', fontFamily: 'monospace' }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          fontSize: '9px',
                          borderRadius: '8px',
                          padding: '4px',
                        }}
                      />
                      <Bar
                        dataKey='delay'
                        fill='#ef4444'
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {bottleneckData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.delay > 15 ? '#ef4444' : '#f59e0b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </div>
              <div className='z-10 mt-4 flex items-center justify-between border-t border-dashed border-muted/30 pt-3 text-[9px] font-black text-muted-foreground/50'>
                <span>已诊断瓶颈批次: {bottleneckData.length} 批</span>
                <span className='cursor-pointer text-rose-500 hover:underline'>
                  瓶颈自愈调停 &rarr;
                </span>
              </div>
            </Card>
          </div>
        </div>

        <DialogContent className='h-[90vh] max-w-[95vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'>
          <DialogHeader className='sr-only'>
            <DialogTitle>Order Blueprint</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className='h-full w-full overflow-hidden p-4'>
              <BlueprintLab orderNo={selectedOrder.orderNo} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

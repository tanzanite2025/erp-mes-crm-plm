'use client'

import { useMemo, useState } from 'react'
import { BarChart3, TrendingUp, Users, Package } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SelectDropdown } from '@/components/select-dropdown'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import {
  useSalesAnalytics,
  useGlobalProductRanking,
} from '../hooks/use-sales-analytics'
import { useSalesAnalyticsProductDisplayMap } from '../hooks/use-sales-analytics-product-display'

type AnalyticsCompatProductDisplay = {
  title: string
  subtitle: string
  code: string
}

function resolveAnalyticsProductDisplay(
  productId: string,
  fallback: AnalyticsCompatProductDisplay,
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
) {
  const projection = productDisplayProjectionMap.get(productId)

  if (projection) {
    return {
      title: projection.title,
      summaryText: projection.summaryText,
      code: projection.code,
    }
  }

  return {
    title: fallback.title,
    summaryText: fallback.subtitle,
    code: fallback.code,
  }
}

export function OrdersAnalysisTab() {
  const { t, locale } = useLanguage()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all')
  const productDisplayProjectionMap = useSalesAnalyticsProductDisplayMap()

  const { data: analytics, isLoading: isAnalyticsLoading } = useSalesAnalytics({
    customerId: selectedCustomerId === 'all' ? undefined : selectedCustomerId,
  })

  const { data: globalRanking, isLoading: isRankingLoading } =
    useGlobalProductRanking(10)
  // Build customer options for filter dropdown
  const customerOptions = useMemo(() => {
    if (!analytics) return []
    return [
      { label: locale === 'zh-CN' ? '全部' : 'All', value: 'all' },
      ...analytics.map((customer) => ({
        label: customer.customerName,
        value: customer.customerId,
      })),
    ]
  }, [analytics, locale])

  const top10ProductVolume = useMemo(
    () => globalRanking?.reduce((acc, curr) => acc + curr.totalQty, 0) || 0,
    [globalRanking]
  )

  const analyzedLines = useMemo(
    () => analytics?.reduce((acc, curr) => acc + curr.totalOrders, 0) || 0,
    [analytics]
  )

  if (isAnalyticsLoading || isRankingLoading) {
    return (
      <div className='space-y-4 p-8'>
        <Skeleton className='h-48 w-full rounded-[32px]' />
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={BarChart3}
        title={locale === 'zh-CN' ? '订单分析' : 'Orders Analysis'}
        description={
          locale === 'zh-CN'
            ? '按客户、产品与订单行聚合销售表现，快速定位热销产品和客户结构。'
            : 'Aggregate sales performance by customer, product, and order lines to identify hot products and customer mix.'
        }
      />

      {/* Header KPI cards */}
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <Card className='min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-blue-500/20 bg-blue-500/5 px-4 py-2.5 shadow-none'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-[11px] leading-none font-black tracking-widest text-blue-600/60 uppercase'>
              {t('trading.analytics.activeCustomers')}
            </p>
            <p className='mt-1 truncate text-[9px] leading-none font-black tracking-[0.16em] uppercase opacity-55'>
              {t('trading.analytics.activeCustomersDesc')}
            </p>
          </div>
          <h3 className='shrink-0 text-xl leading-none font-black tracking-tighter italic'>
            {analytics?.length || 0}
          </h3>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-500/15 bg-blue-500/5'>
            <Users className='size-4 text-blue-600/45' />
          </div>
        </Card>

        <Card className='min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 shadow-none'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-[11px] leading-none font-black tracking-widest text-emerald-600/60 uppercase'>
              {t('trading.analytics.top10ProductVolume')}
            </p>
            <p className='mt-1 truncate text-[9px] leading-none font-black tracking-[0.16em] uppercase opacity-55'>
              {t('trading.analytics.top10ProductVolumeDesc')}
            </p>
          </div>
          <h3 className='shrink-0 text-xl leading-none font-black tracking-tighter italic'>
            {/* [UI-DISPLAY-ONLY]: Summarizes only the currently loaded Top 10 list. */}
            {top10ProductVolume.toLocaleString()}
          </h3>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/15 bg-emerald-500/5'>
            <TrendingUp className='size-4 text-emerald-600/45' />
          </div>
        </Card>

        <Card className='min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-2.5 shadow-none'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-[11px] leading-none font-black tracking-widest text-amber-600/60 uppercase'>
              {t('trading.analytics.analyzedLines')}
            </p>
            <p className='mt-1 truncate text-[9px] leading-none font-black tracking-[0.16em] uppercase opacity-55'>
              {t('trading.analytics.analyzedLinesDesc')}
            </p>
          </div>
          <h3 className='shrink-0 text-xl leading-none font-black tracking-tighter italic'>
            {/* [UI-DISPLAY-ONLY]: Summarizes only currently loaded customer orders. */}
            {analyzedLines}
          </h3>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/15 bg-amber-500/5'>
            <BarChart3 className='size-4 text-amber-600/45' />
          </div>
        </Card>
      </div>

      {/* Core analysis area */}
      <div className='flex flex-col gap-8 lg:flex-row'>
        {/* Left: per-customer ranking list */}
        <div className='flex-1 space-y-6'>
          <div className='flex items-center justify-between border-b border-dashed border-muted/50 pb-2'>
            <h2 className='flex items-center gap-2 text-sm font-black tracking-tighter uppercase italic'>
              <Package className='size-5 text-primary' />
              {t('trading.analytics.customerProductRanking')}
            </h2>
            <div className='flex gap-2'>
              <SelectDropdown
                isControlled
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                items={customerOptions}
                placeholder={t('trading.analytics.filterCustomer')}
                className='h-10 w-[200px] rounded-full border-none bg-muted/50 text-[10px] font-black uppercase'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4'>
            {analytics?.map((customer) => (
              <Card
                key={customer.customerId}
                className='group rounded-[24px] border-dashed border-muted/40 p-5 transition-all hover:border-primary/40'
              >
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                        {t('trading.analytics.customerId')}
                      </span>
                      <span className='font-mono text-[9px] font-semibold tracking-[0.12em] text-foreground/95'>
                        {customer.customerId}
                      </span>
                    </div>
                    <h4 className='text-sm font-black tracking-tight italic'>
                      {customer.customerName}
                    </h4>
                  </div>
                  <Badge
                    variant='outline'
                    className='h-5 rounded-full border-primary/25 bg-primary/10 px-2.5 font-mono text-[8px] tracking-[0.16em] text-primary uppercase'
                  >
                    {customer.products.length}{' '}
                    {t('trading.analytics.productCount')}
                  </Badge>
                </div>

                <div className='space-y-3'>
                  {customer.products.slice(0, 3).map((prod, idx) => {
                    const display = resolveAnalyticsProductDisplay(
                      prod.productId,
                      prod.productDisplay,
                      productDisplayProjectionMap
                    )

                    return (
                      <div
                        key={prod.productId}
                        className='flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-muted/30'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`flex size-6 items-center justify-center rounded-lg border text-[10px] font-black italic ${
                              idx === 0
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                                : idx === 1
                                  ? 'border-slate-400/20 bg-slate-400/10 text-slate-500'
                                  : 'border-orange-600/20 bg-orange-600/10 text-orange-600'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className='flex flex-col'>
                            <span className='text-[10px] font-black tracking-tight'>
                              {display.title}
                            </span>
                            <span className='text-[8px] font-black tracking-widest uppercase opacity-40'>
                              {display.summaryText || '--'}
                            </span>
                            <span className='font-mono text-[9px] tracking-[0.14em] text-foreground/70'>
                              {display.code || '--'}
                            </span>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-[11px] leading-none font-black italic'>
                            {prod.totalQty.toLocaleString()}
                          </p>
                          <p className='text-[9px] font-black tracking-[0.16em] text-muted-foreground/60 uppercase'>
                            {t('trading.analytics.orderedUnits')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {customer.products.length > 3 && (
                    <p className='mt-2 text-center text-[8px] font-black tracking-[0.2em] uppercase opacity-30'>
                      {t('trading.analytics.moreProducts', {
                        count: customer.products.length - 3,
                      })}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: global hotlist ranking */}
        <div className='w-full space-y-6 lg:w-[320px]'>
          <div className='flex items-center gap-2 border-b border-dashed border-muted/50 pb-2'>
            <TrendingUp className='size-4 text-emerald-500' />
            <h3 className='text-sm font-black tracking-tighter uppercase italic'>
              {t('trading.analytics.globalHotlist')}
            </h3>
          </div>

          <Card className='space-y-6 rounded-[32px] border-none bg-muted/10 p-6 shadow-inner'>
            {globalRanking?.map((prod, idx) => {
              const display = resolveAnalyticsProductDisplay(
                prod.productId,
                prod.productDisplay,
                productDisplayProjectionMap
              )

              return (
                <div
                  key={prod.productId}
                  className='flex animate-in flex-col gap-1.5 duration-500 fade-in slide-in-from-right-4'
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='min-w-0'>
                      <span className='block max-w-[150px] truncate text-[10px] font-black tracking-tight italic'>
                        {display.title}
                      </span>
                      <span className='block max-w-[150px] truncate font-mono text-[8px] uppercase opacity-40'>
                        {display.code || display.summaryText || '--'}
                      </span>
                    </div>
                    <span className='font-mono text-[10px] font-bold text-primary'>
                      {Math.round(
                        (prod.totalQty / (globalRanking[0]?.totalQty || 1)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className='h-1 overflow-hidden rounded-full bg-muted/20'>
                    <div
                      className='h-full rounded-full bg-linear-to-r from-primary to-blue-400 transition-all duration-1000 ease-out'
                      style={{
                        width: `${(prod.totalQty / (globalRanking[0]?.totalQty || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </div>
  )
}

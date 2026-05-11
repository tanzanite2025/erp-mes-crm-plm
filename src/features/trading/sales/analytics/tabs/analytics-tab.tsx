'use client'

import { useMemo, useState } from 'react'
import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package
} from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Card } from '@/components/ui/card'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import { useSalesAnalytics, useGlobalProductRanking } from '../hooks/use-sales-analytics'
import { useSalesAnalyticsProductDisplayMap } from '../hooks/use-sales-analytics-product-display'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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
    customerId: selectedCustomerId === 'all' ? undefined : selectedCustomerId
  })
  
  const { data: globalRanking, isLoading: isRankingLoading } = useGlobalProductRanking(10)
  // Build customer options for filter dropdown
  const customerOptions = useMemo(() => {
    if (!analytics) return []
    return [
      { label: locale === 'zh-CN' ? '全部' : 'All', value: 'all' },
      ...analytics.map((customer) => ({ label: customer.customerName, value: customer.customerId }))
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
    return <div className="p-8 space-y-4"><Skeleton className="h-48 w-full rounded-[32px]" /></div>
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-blue-500/20 bg-blue-500/5 px-4 py-2.5 shadow-none">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-widest text-blue-600/60 leading-none">
               {t('trading.analytics.activeCustomers')}
            </p>
            <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] opacity-55 leading-none">
              {t('trading.analytics.activeCustomersDesc')}
            </p>
          </div>
          <h3 className="shrink-0 text-xl font-black tracking-tighter italic leading-none">
            {analytics?.length || 0}
          </h3>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-500/15 bg-blue-500/5">
            <Users className="size-4 text-blue-600/45" />
          </div>
        </Card>

        <Card className="min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 shadow-none">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-widest text-emerald-600/60 leading-none">
              {t('trading.analytics.top10ProductVolume')}
            </p>
            <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] opacity-55 leading-none">
              {t('trading.analytics.top10ProductVolumeDesc')}
            </p>
          </div>
          <h3 className="shrink-0 text-xl font-black tracking-tighter italic leading-none">
            {/* [UI-DISPLAY-ONLY]: Summarizes only the currently loaded Top 10 list. */}
            {top10ProductVolume.toLocaleString()}
          </h3>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/15 bg-emerald-500/5">
            <TrendingUp className="size-4 text-emerald-600/45" />
          </div>
        </Card>

        <Card className="min-h-[76px] flex-row items-center gap-3 rounded-[24px] border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-2.5 shadow-none">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-widest text-amber-600/60 leading-none">
              {t('trading.analytics.analyzedLines')}
            </p>
            <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] opacity-55 leading-none">
              {t('trading.analytics.analyzedLinesDesc')}
            </p>
          </div>
          <h3 className="shrink-0 text-xl font-black tracking-tighter italic leading-none">
            {/* [UI-DISPLAY-ONLY]: Summarizes only currently loaded customer orders. */}
            {analyzedLines}
          </h3>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/15 bg-amber-500/5">
            <BarChart3 className="size-4 text-amber-600/45" />
          </div>
        </Card>
      </div>

      {/* Core analysis area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: per-customer ranking list */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-dashed border-muted/50">
            <h2 className="text-sm font-black tracking-tighter italic uppercase flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t('trading.analytics.customerProductRanking')}
            </h2>
            <div className="flex gap-2">
               <SelectDropdown
                isControlled
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                items={customerOptions}
                placeholder={t('trading.analytics.filterCustomer')}
                className="h-10 rounded-full bg-muted/50 border-none w-[200px] text-[10px] font-black uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {analytics?.map((customer) => (
              <Card key={customer.customerId} className="rounded-[24px] border-dashed border-muted/40 hover:border-primary/40 transition-all p-5 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t('trading.analytics.customerId')}</span>
                      <span className="text-[9px] font-mono font-semibold tracking-[0.12em] text-foreground/95">{customer.customerId}</span>
                    </div>
                    <h4 className="text-sm font-black italic tracking-tight">{customer.customerName}</h4>
                  </div>
                  <Badge variant="outline" className="rounded-full h-5 px-2.5 text-[8px] font-mono tracking-[0.16em] bg-primary/10 border-primary/25 text-primary uppercase">
                    {customer.products.length} {t('trading.analytics.productCount')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {customer.products.slice(0, 3).map((prod, idx) => {
                    const display = resolveAnalyticsProductDisplay(
                      prod.productId,
                      prod.productDisplay,
                      productDisplayProjectionMap
                    )

                    return (
                    <div key={prod.productId} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className={`size-6 rounded-lg flex items-center justify-center text-[10px] font-black italic border ${
                            idx === 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                            idx === 1 ? 'bg-slate-400/10 border-slate-400/20 text-slate-500' :
                            'bg-orange-600/10 border-orange-600/20 text-orange-600'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black tracking-tight">{display.title}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{display.summaryText || '--'}</span>
                            <span className="text-[9px] font-mono tracking-[0.14em] text-foreground/70">{display.code || '--'}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[11px] font-black italic leading-none">{prod.totalQty.toLocaleString()}</p>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">{t('trading.analytics.orderedUnits')}</p>
                       </div>
                    </div>
                    )
                  })}
                  {customer.products.length > 3 && (
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-center opacity-30 mt-2">
                       {t('trading.analytics.moreProducts', { count: customer.products.length - 3 })}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: global hotlist ranking */}
        <div className="w-full lg:w-[320px] space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-dashed border-muted/50">
            <TrendingUp className="size-4 text-emerald-500" />
            <h3 className="text-sm font-black italic tracking-tighter uppercase">{t('trading.analytics.globalHotlist')}</h3>
          </div>

          <Card className="rounded-[32px] border-none bg-muted/10 shadow-inner p-6 space-y-6">
            {globalRanking?.map((prod, idx) => {
              const display = resolveAnalyticsProductDisplay(
                prod.productId,
                prod.productDisplay,
                productDisplayProjectionMap
              )

              return (
              <div key={prod.productId} className="flex flex-col gap-1.5 animate-in slide-in-from-right-4 fade-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] font-black italic tracking-tight max-w-[150px]">{display.title}</span>
                    <span className="block truncate text-[8px] font-mono uppercase opacity-40 max-w-[150px]">{display.code || display.summaryText || '--'}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary">{Math.round((prod.totalQty / (globalRanking[0]?.totalQty || 1)) * 100)}%</span>
                </div>
                <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-linear-to-r from-primary to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(prod.totalQty / (globalRanking[0]?.totalQty || 1)) * 100}%` }}
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

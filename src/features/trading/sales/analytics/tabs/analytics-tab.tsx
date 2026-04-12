'use client'

import { useMemo, useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  ArrowUpRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import { useSalesAnalytics, useGlobalProductRanking } from '../hooks/use-sales-analytics'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function OrdersAnalysisTab() {
  const { t, locale } = useLanguage()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all')
  
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

  const globalVolume = useMemo(
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
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 mt-4">
      {/* Header KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-dashed bg-blue-500/5 p-6 border-blue-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <Users className="size-16" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 mb-1 italic">
             {t('trading.analytics.activeCustomers')}
          </p>
          <h3 className="text-3xl font-black tracking-tighter italic">
            {analytics?.length || 0}
          </h3>
          <p className="text-[8px] font-mono mt-2 opacity-50 uppercase tracking-widest">
            {t('trading.analytics.activeCustomersDesc')}
          </p>
        </Card>

        <Card className="rounded-[32px] border-dashed bg-emerald-500/5 p-6 border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <TrendingUp className="size-16" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mb-1 italic">
            {t('trading.analytics.globalVolume')}
          </p>
          <h3 className="text-3xl font-black tracking-tighter italic">
            {/* [UI-DISPLAY-ONLY]: Summarizes only the currently loaded Top 10 list. */}
            {globalVolume.toLocaleString()}
          </h3>
          <p className="text-[8px] font-mono mt-2 opacity-50 uppercase tracking-widest">
            {t('trading.analytics.globalVolumeDesc')}
          </p>
        </Card>

        <Card className="rounded-[32px] border-dashed bg-amber-500/5 p-6 border-amber-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <BarChart3 className="size-16" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1 italic">
            {t('trading.analytics.analyzedLines')}
          </p>
          <h3 className="text-3xl font-black tracking-tighter italic">
            {/* [UI-DISPLAY-ONLY]: Summarizes only currently loaded customer orders. */}
            {analyzedLines}
          </h3>
          <p className="text-[8px] font-mono mt-2 opacity-50 uppercase tracking-widest">
            {t('trading.analytics.analyzedLinesDesc')}
          </p>
        </Card>
      </div>

      {/* Core analysis area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: per-customer ranking list */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-dashed border-muted/50">
            <h2 className="text-lg font-black tracking-tighter italic uppercase flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t('trading.tabs.ordersAnalysis')} 
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
                  <div className="flex flex-col">
                    <p className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-widest">{t('trading.analytics.customerId')}: {customer.customerId}</p>
                    <h4 className="text-sm font-black italic tracking-tight">{customer.customerName}</h4>
                  </div>
                  <Badge variant="outline" className="rounded-full h-5 text-[8px] font-mono bg-primary/5 border-primary/20 text-primary uppercase">
                    {customer.products.length} {t('trading.analytics.productCount')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {customer.products.slice(0, 3).map((prod, idx) => (
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
                            <span className="text-[10px] font-black tracking-tight">{prod.productModel}</span>
                            <span className="text-[8px] font-mono opacity-40 uppercase">{prod.productCode}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black italic leading-none">{prod.totalQty.toLocaleString()}</p>
                          <p className="text-[8px] font-mono opacity-40 uppercase tracking-tighter">{t('trading.analytics.orderedUnits')}</p>
                       </div>
                    </div>
                  ))}
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
            {globalRanking?.map((prod, idx) => (
              <div key={prod.productId} className="flex flex-col gap-1.5 animate-in slide-in-from-right-4 fade-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black italic tracking-tight truncate max-w-[150px]">{prod.productModel}</span>
                  <span className="text-[10px] font-mono font-bold text-primary">{Math.round((prod.totalQty / (globalRanking[0]?.totalQty || 1)) * 100)}%</span>
                </div>
                <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(prod.totalQty / (globalRanking[0]?.totalQty || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>

          <Button variant="outline" className="w-full h-11 rounded-full border-dashed border-muted/50 font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 group">
             {t('trading.analytics.viewMarketReport')}
             <ArrowUpRight className="ml-2 size-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}

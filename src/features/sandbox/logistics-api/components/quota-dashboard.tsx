import { Gauge, AlertTriangle, Activity, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface QuotaInfo {
  providerName: string
  providerCode: string
  quotaTotal: number
  quotaUsed: number
  quotaAlertAt: number
}

interface QuotaDashboardProps {
  providers: QuotaInfo[]
}

/**
 * QuotaDashboard - API 额度实时监控看板
 * 以柱状仪表的形式监控每个物流服务商的 API 余量
 */
export function QuotaDashboard({ providers }: QuotaDashboardProps) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Gauge className='size-4 text-slate-400' />
        <h3 className='text-[10px] font-black tracking-widest text-slate-500 uppercase'>
          API Quota Monitor / 接口额度监控
        </h3>
      </div>

      {providers.length === 0 ? (
        <div className='rounded-[24px] border border-dashed border-slate-200 py-6 text-center text-slate-300'>
          <Activity className='mx-auto mb-2 size-6 opacity-30' />
          <p className='text-[10px] font-black tracking-widest uppercase'>
            No Providers Configured
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {providers.map((p) => {
            // [UI-ONLY-CALC]: 派生字段计算。建议未来由后端 QuotaInfo 结构直接提供 authoritative 'remaining'。
            const remaining = p.quotaTotal - p.quotaUsed
            const usagePercent =
              p.quotaTotal > 0 ? (p.quotaUsed / p.quotaTotal) * 100 : 0
            const isAlert = remaining <= p.quotaAlertAt && p.quotaTotal > 0
            const isCritical =
              remaining <= Math.floor(p.quotaAlertAt / 2) && p.quotaTotal > 0

            return (
              <Card
                key={p.providerCode}
                className={`overflow-hidden rounded-[24px] border-dashed transition-all ${
                  isCritical
                    ? 'animate-pulse border-rose-300 bg-rose-50/30'
                    : isAlert
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <CardHeader className='pb-2'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tighter uppercase italic'>
                      {isCritical && (
                        <AlertTriangle className='size-4 text-rose-500' />
                      )}
                      {isAlert && !isCritical && (
                        <TrendingDown className='size-4 text-amber-500' />
                      )}
                      {p.providerName}
                    </CardTitle>
                    <Badge
                      variant='outline'
                      className={`h-5 rounded-full px-2 font-mono text-[8px] font-black tracking-tighter uppercase ${
                        isCritical
                          ? 'border-rose-200 bg-rose-100 text-rose-600'
                          : isAlert
                            ? 'border-amber-200 bg-amber-100 text-amber-600'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isCritical ? 'CRITICAL' : isAlert ? 'ALERT' : 'HEALTHY'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <Progress
                    value={usagePercent}
                    className={`h-1.5 ${isCritical ? '[&>div]:bg-rose-500' : isAlert ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                  />
                  <div className='flex items-end justify-between'>
                    <div>
                      <span className='text-[8px] font-black tracking-widest text-slate-400 uppercase'>
                        Remaining
                      </span>
                      <p
                        className={`text-2xl font-black tracking-tighter italic tabular-nums ${isCritical ? 'text-rose-600' : isAlert ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {remaining.toLocaleString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <span className='text-[8px] font-black tracking-widest text-slate-400 uppercase'>
                        Used / Total
                      </span>
                      <p className='font-mono text-xs font-bold text-slate-400'>
                        {p.quotaUsed.toLocaleString()} /{' '}
                        {p.quotaTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

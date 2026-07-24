import { CreditCard, DollarSign, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTraceStats } from '../hooks/use-trace-stats'

function renderPendingConnection(label: string) {
  return (
    <>
      <div className='text-sm leading-none font-black tracking-tighter text-muted-foreground/70 md:text-base'>
        {label}
      </div>
      <p className='mt-0.5 text-[8px] leading-none font-bold tracking-tight text-muted-foreground/40 uppercase'>
        {label}
      </p>
    </>
  )
}

export function KpiGrid() {
  const { t } = useLanguage()
  const { stats, loading } = useTraceStats()
  const pendingLabel = t('dashboard.page.pendingConnection.label')

  if (loading || !stats) {
    return (
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='animate-pulse gap-2 py-2 md:py-2.5'>
            <CardHeader className='h-10 px-3 md:px-3.5' />
            <CardContent className='h-8 px-3 pb-2 md:px-3.5 md:pb-2.5' />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {/* REALTIME_WIP */}
      <Link
        to='/business-analysis/production-capacity'
        className='group block rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none md:rounded-[24px]'
        aria-label={t('dashboard.page.kpi.wip.openAnalysis')}
      >
        <Card className='relative h-full gap-2 overflow-hidden rounded-xl border-dashed border-muted/50 bg-muted/5 py-2 shadow-none transition-all hover:bg-muted/10 md:rounded-[24px] md:py-2.5'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <CardHeader className='z-10 flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
            <CardTitle className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
              {t('dashboard.page.kpi.wip.title')}
            </CardTitle>
            <div className='rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 transition-transform group-hover:scale-110'>
              <DollarSign className='h-3 w-3 stroke-[2.5]' />
            </div>
          </CardHeader>
          <CardContent className='z-10 px-3 pb-0.5 md:px-3.5'>
            {stats.availability.wip.connected ? (
              <>
                <div className='text-lg leading-none font-black tracking-tighter text-emerald-700 italic md:text-xl'>
                  {stats.wip.toLocaleString()}{' '}
                  <span className='ml-1 text-[9px] font-black text-emerald-600/40 uppercase not-italic'>
                    {t('dashboard.page.kpi.wip.unit')}
                  </span>
                </div>
                <p className='mt-0.5 text-[8px] leading-none font-bold tracking-tight text-muted-foreground/40 uppercase'>
                  {t('dashboard.page.kpi.wip.description')}
                </p>
                <p className='mt-1 text-[8px] leading-none font-black tracking-widest text-emerald-600/60 uppercase'>
                  {t('dashboard.page.kpi.wip.openAnalysis')} →
                </p>
              </>
            ) : (
              renderPendingConnection(pendingLabel)
            )}
          </CardContent>
        </Card>
      </Link>

      {/* SCRAP_FLOW */}
      <Link
        to='/business-analysis/scrap'
        className='group block rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none md:rounded-[24px]'
        aria-label={t('dashboard.page.kpi.scrap.openAnalysis')}
      >
        <Card className='relative h-full gap-2 overflow-hidden rounded-xl border-dashed border-rose-500/20 bg-rose-500/2 py-2 shadow-none transition-all hover:bg-rose-500/5 md:rounded-[24px] md:py-2.5'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <CardHeader className='z-10 flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
            <CardTitle className='text-[10px] font-black tracking-widest text-rose-600/60 uppercase italic'>
              {t('dashboard.page.kpi.scrap.title')}
            </CardTitle>
            <div className='rounded-lg bg-rose-500/10 p-1.5 text-rose-500 transition-transform group-hover:scale-110'>
              <Users className='h-3 w-3 stroke-[2.5]' />
            </div>
          </CardHeader>
          <CardContent className='z-10 px-3 pb-0.5 md:px-3.5'>
            {stats.availability.scrap.connected ? (
              <>
                <div className='text-lg leading-none font-black tracking-tighter text-rose-600 italic md:text-xl'>
                  {stats.scrap}{' '}
                  <span className='ml-1 text-[9px] font-black text-rose-500/40 uppercase not-italic'>
                    {t('dashboard.page.kpi.scrap.unit')}
                  </span>
                </div>
                <div className='mt-0.5 flex items-center gap-1'>
                  <span className='size-1 animate-pulse rounded-full bg-rose-500' />
                  <p className='text-[8px] leading-none font-bold tracking-tight text-rose-600/50 uppercase'>
                    {stats.availability.scrapDelta.connected
                      ? t('dashboard.page.kpi.scrap.delta', {
                          value: stats.scrapDelta,
                        })
                      : pendingLabel}
                  </p>
                </div>
                <p className='mt-1 text-[8px] leading-none font-black tracking-widest text-rose-600/60 uppercase'>
                  {t('dashboard.page.kpi.scrap.openAnalysis')} →
                </p>
              </>
            ) : (
              renderPendingConnection(pendingLabel)
            )}
          </CardContent>
        </Card>
      </Link>

      {/* DELIVERY_GAP */}
      <Link
        to='/business-analysis/orders'
        className='group block rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none md:rounded-[24px]'
        aria-label={t('dashboard.page.kpi.gap.openAnalysis')}
      >
        <Card className='relative h-full gap-2 overflow-hidden rounded-xl border-dashed border-amber-500/20 bg-amber-500/2 py-2 shadow-none transition-all hover:bg-amber-500/5 md:rounded-[24px] md:py-2.5'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <CardHeader className='z-10 flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
            <CardTitle className='text-[10px] font-black tracking-widest text-amber-600/60 uppercase italic'>
              {t('dashboard.page.kpi.gap.title')}
            </CardTitle>
            <div className='rounded-lg bg-amber-500/10 p-1.5 text-amber-600 transition-transform group-hover:scale-110'>
              <CreditCard className='h-3 w-3 stroke-[2.5]' />
            </div>
          </CardHeader>
          <CardContent className='z-10 px-3 pb-0.5 md:px-3.5'>
            {stats.availability.gapOrders.connected ? (
              <>
                <div className='text-lg leading-none font-black tracking-tighter text-amber-600 italic md:text-xl'>
                  {stats.gapOrders}{' '}
                  <span className='ml-1 text-[9px] font-black text-amber-600/40 uppercase not-italic'>
                    {t('dashboard.page.kpi.gap.unit')}
                  </span>
                </div>
                <p className='mt-0.5 text-[8px] leading-none font-bold tracking-tight text-amber-600/50 uppercase'>
                  {stats.availability.gapDescription.connected
                    ? t('dashboard.page.kpi.gap.description', {
                        value: stats.gapDescription,
                      })
                    : pendingLabel}
                </p>
                <p className='mt-1 text-[8px] leading-none font-black tracking-widest text-amber-600/60 uppercase'>
                  {t('dashboard.page.kpi.gap.openAnalysis')} →
                </p>
              </>
            ) : (
              renderPendingConnection(pendingLabel)
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

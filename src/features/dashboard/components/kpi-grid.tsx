import { CreditCard, DollarSign, Users } from 'lucide-react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { useTraceStats } from '../hooks/use-trace-stats'

function renderPendingConnection(label: string) {
    return (
        <>
            <div className='text-sm md:text-base font-black tracking-tighter text-muted-foreground/70 leading-none'>
                {label}
            </div>
            <p className='mt-0.5 text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tight leading-none'>
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
            <Card className='gap-2 rounded-xl border-dashed border-muted/50 bg-muted/5 py-2 md:rounded-[24px] md:py-2.5 shadow-none transition-all group overflow-hidden hover:bg-muted/10'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        {t('dashboard.page.kpi.wip.title')}
                    </CardTitle>
                    <div className='rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 transition-transform group-hover:scale-110'>
                        <DollarSign className='h-3 w-3 stroke-[2.5]' />
                    </div>
                </CardHeader>
                <CardContent className='px-3 pb-0.5 md:px-3.5'>
                    {stats.availability.wip.connected ? (
                        <>
                            <div className='text-lg md:text-xl font-black tracking-tighter leading-none text-emerald-700'>
                                {stats.wip.toLocaleString()} <span className='ml-1 text-[9px] font-black uppercase text-emerald-600/40'>{t('dashboard.page.kpi.wip.unit')}</span>
                            </div>
                            <p className='mt-0.5 text-[8px] font-bold uppercase tracking-tight text-muted-foreground/40 leading-none'>
                                {t('dashboard.page.kpi.wip.description')}
                            </p>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>

            {/* SCRAP_FLOW */}
            <Card className='gap-2 rounded-xl border-dashed border-rose-500/20 bg-rose-500/2 py-2 md:rounded-[24px] md:py-2.5 shadow-none transition-all group overflow-hidden hover:bg-rose-500/5'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                        {t('dashboard.page.kpi.scrap.title')}
                    </CardTitle>
                    <div className='rounded-lg bg-rose-500/10 p-1.5 text-rose-500 transition-transform group-hover:scale-110'>
                        <Users className='h-3 w-3 stroke-[2.5]' />
                    </div>
                </CardHeader>
                <CardContent className='px-3 pb-0.5 md:px-3.5'>
                    {stats.availability.scrap.connected ? (
                        <>
                            <div className='text-lg md:text-xl font-black tracking-tighter leading-none text-rose-600'>
                                {stats.scrap} <span className='ml-1 text-[9px] font-black uppercase text-rose-500/40'>{t('dashboard.page.kpi.scrap.unit')}</span>
                            </div>
                            <div className='mt-0.5 flex items-center gap-1'>
                                <span className='size-1 rounded-full bg-rose-500 animate-pulse' />
                                <p className='text-[8px] font-bold uppercase tracking-tight text-rose-600/50 leading-none'>
                                    {stats.availability.scrapDelta.connected
                                        ? t('dashboard.page.kpi.scrap.delta', { value: stats.scrapDelta })
                                        : pendingLabel}
                                </p>
                            </div>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>

            {/* DELIVERY_GAP */}
            <Card className='gap-2 rounded-xl border-dashed border-amber-500/20 bg-amber-500/2 py-2 md:rounded-[24px] md:py-2.5 shadow-none transition-all group overflow-hidden hover:bg-amber-500/5'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 px-3 pt-0.5 pb-0 md:px-3.5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                        {t('dashboard.page.kpi.gap.title')}
                    </CardTitle>
                    <div className='rounded-lg bg-amber-500/10 p-1.5 text-amber-600 transition-transform group-hover:scale-110'>
                        <CreditCard className='h-3 w-3 stroke-[2.5]' />
                    </div>
                </CardHeader>
                <CardContent className='px-3 pb-0.5 md:px-3.5'>
                    {stats.availability.gapOrders.connected ? (
                        <>
                            <div className='text-lg md:text-xl font-black tracking-tighter leading-none text-amber-600'>
                                {stats.gapOrders} <span className='ml-1 text-[9px] font-black uppercase text-amber-600/40'>{t('dashboard.page.kpi.gap.unit')}</span>
                            </div>
                            <p className='mt-0.5 text-[8px] font-bold uppercase tracking-tight text-amber-600/50 leading-none'>
                                {stats.availability.gapDescription.connected
                                    ? t('dashboard.page.kpi.gap.description', { value: stats.gapDescription })
                                    : pendingLabel}
                            </p>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>

        </div>
    )
}

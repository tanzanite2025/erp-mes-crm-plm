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
            <div className='text-base md:text-lg font-black tracking-tighter text-muted-foreground/70'>
                {label}
            </div>
            <p className='text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tight mt-1'>
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
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className='animate-pulse'>
                        <CardHeader className='h-20' />
                        <CardContent className='h-24' />
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {/* REALTIME_WIP */}
            <Card className='rounded-xl md:rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-none hover:bg-muted/10 transition-all group overflow-hidden'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4 md:px-5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        {t('dashboard.page.kpi.wip.title')}
                    </CardTitle>
                    <div className='p-2 rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='2.5'
                            className='h-3.5 w-3.5'
                        >
                            <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                        </svg>
                    </div>
                </CardHeader>
                <CardContent className='pb-4 px-4 md:px-5'>
                    {stats.availability.wip.connected ? (
                        <>
                            <div className='text-xl md:text-2xl font-black tracking-tighter text-emerald-700'>
                                {stats.wip.toLocaleString()} <span className='text-[10px] uppercase font-black text-emerald-600/40 ml-1'>{t('dashboard.page.kpi.wip.unit')}</span>
                            </div>
                            <p className='text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tight mt-1'>
                                {t('dashboard.page.kpi.wip.description')}
                            </p>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>

            {/* SCRAP_FLOW */}
            <Card className='rounded-xl md:rounded-[24px] border-dashed border-rose-500/20 bg-rose-500/[0.02] shadow-none hover:bg-rose-500/[0.05] transition-all group overflow-hidden'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4 md:px-5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                        {t('dashboard.page.kpi.scrap.title')}
                    </CardTitle>
                    <div className='p-2 rounded-xl bg-rose-500/10 text-rose-500 transition-transform group-hover:scale-110'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='2.5'
                            className='h-3.5 w-3.5'
                        >
                            <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                            <circle cx='9' cy='7' r='4' />
                            <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                        </svg>
                    </div>
                </CardHeader>
                <CardContent className='pb-4 px-4 md:px-5'>
                    {stats.availability.scrap.connected ? (
                        <>
                            <div className='text-xl md:text-2xl font-black tracking-tighter text-rose-600'>
                                {stats.scrap} <span className='text-[10px] uppercase font-black text-rose-500/40 ml-1'>{t('dashboard.page.kpi.scrap.unit')}</span>
                            </div>
                            <div className='flex items-center gap-1.5 mt-1'>
                                <span className='size-1 rounded-full bg-rose-500 animate-pulse' />
                                <p className='text-[9px] font-bold text-rose-600/50 uppercase tracking-tight'>
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
            <Card className='rounded-xl md:rounded-[24px] border-dashed border-amber-500/20 bg-amber-500/[0.02] shadow-none hover:bg-amber-500/[0.05] transition-all group overflow-hidden'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4 md:px-5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                        {t('dashboard.page.kpi.gap.title')}
                    </CardTitle>
                    <div className='p-2 rounded-xl bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='2.5'
                            className='h-3.5 w-3.5'
                        >
                            <rect width='20' height='14' x='2' y='5' rx='2' />
                            <path d='M2 10h20' />
                        </svg>
                    </div>
                </CardHeader>
                <CardContent className='pb-4 px-4 md:px-5'>
                    {stats.availability.gapOrders.connected ? (
                        <>
                            <div className='text-xl md:text-2xl font-black tracking-tighter text-amber-600'>
                                {stats.gapOrders} <span className='text-[10px] uppercase font-black text-amber-600/40 ml-1'>{t('dashboard.page.kpi.gap.unit')}</span>
                            </div>
                            <p className='text-[9px] font-bold text-amber-600/50 uppercase tracking-tight mt-1'>
                                {stats.availability.gapDescription.connected
                                    ? t('dashboard.page.kpi.gap.description', { value: stats.gapDescription })
                                    : pendingLabel}
                            </p>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>

            {/* SN_ACTIVATION */}
            <Card className='rounded-xl md:rounded-[24px] border-dashed border-blue-500/20 bg-blue-500/[0.02] shadow-none hover:bg-blue-500/[0.05] transition-all group overflow-hidden'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4 md:px-5'>
                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
                        {t('dashboard.page.kpi.activation.title')}
                    </CardTitle>
                    <div className='p-2 rounded-xl bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-110'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='2.5'
                            className='h-3.5 w-3.5'
                        >
                            <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                        </svg>
                    </div>
                </CardHeader>
                <CardContent className='pb-4 px-4 md:px-5'>
                    {stats.availability.totalSn.connected ? (
                        <>
                            <div className='text-xl md:text-2xl font-black tracking-tighter text-blue-700'>
                                {stats.totalSn.toLocaleString()} <span className='text-[10px] font-black text-blue-600/40 ml-1 uppercase'>{t('dashboard.page.kpi.activation.unit')}</span>
                            </div>
                            <p className='text-[9px] font-bold text-blue-600/40 uppercase tracking-tight mt-1'>
                                {t('dashboard.page.kpi.activation.description')}
                            </p>
                        </>
                    ) : renderPendingConnection(pendingLabel)}
                </CardContent>
            </Card>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent } from '@/components/ui/card'
import { ProductionCalendarService, type OrderProgress } from '@/features/production-calendar/services/production-calendar-service'
import { PackageSearch, Activity, Zap, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { 
    Dialog, 
    DialogContent, 
    DialogTrigger,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { BlueprintLab } from '@/features/labs/blueprint'

type OrdersLoadErrorReason = 'unauthorized' | 'forbidden' | 'network' | 'server' | 'invalidResponse' | 'unknown'

function resolveOrdersLoadErrorReason(error: unknown): OrdersLoadErrorReason {
    if (error && typeof error === 'object' && 'status' in error) {
        const status = Number((error as { status?: unknown }).status)
        if (status === 401) return 'unauthorized'
        if (status === 403) return 'forbidden'
        if (status >= 500) return 'server'
    }

    if (error instanceof Error) {
        if (error.message.includes('[TIMEOUT]') || error.message.includes('Failed to fetch')) {
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
    const [errorReason, setErrorReason] = useState<OrdersLoadErrorReason | null>(null)
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
        return () => window.removeEventListener('xdfc_production_plans_updated', handleSync)
    }, [])

    if (loading) {
        return (
            <div className='flex flex-col gap-6 animate-pulse'>
                {[1, 2, 3].map(i => (
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
            <div className='flex flex-col items-center justify-center py-20 border-2 border-dashed border-rose-200 rounded-[40px] bg-rose-50/40 text-rose-700'>
                <TriangleAlert className='size-12 mb-4 opacity-80' />
                <p className='text-[10px] font-black uppercase tracking-[0.3em] italic'>
                    {t('dashboard.page.reports.error.title')}
                </p>
                <p className='text-[11px] mt-2 text-center max-w-md px-6'>
                    {t('dashboard.page.reports.error.description')}
                </p>
                <p className='text-[10px] mt-4 font-semibold tracking-wide'>
                    {t('dashboard.page.reports.error.reasonPrefix')}
                    {t(`dashboard.page.reports.error.reasons.${errorReason}`)}
                </p>
                {errorMessage && (
                    <div className='mt-6 p-4 rounded-xl bg-white/50 border border-rose-100 max-w-xl w-full'>
                        <p className='text-[9px] font-mono text-rose-900 break-all leading-relaxed'>
                            [STACK_TRACE]: {errorMessage}
                        </p>
                    </div>
                )}
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-20 border-2 border-dashed border-muted/20 rounded-[40px] bg-muted/5 text-muted-foreground'>
                <PackageSearch className='size-12 mb-4 opacity-10 animate-pulse' />
                <p className='text-[10px] font-black uppercase tracking-[0.3em] italic'>
                    {t('dashboard.page.reports.empty.title')}
                </p>
                <p className='text-[9px] mt-2 opacity-40 uppercase tracking-widest'>
                    {t('dashboard.page.reports.empty.description')}
                </p>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700'>
            <Dialog 
                open={!!selectedOrder} 
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            >
                {orders.map((order) => {
                    const target = Math.max(1, order.target)
                    const completedPct = Math.min(100, (order.completed / target) * 100)
                    const wipPct = Math.min(100 - completedPct, (order.wip / target) * 100)
                    const gap = Math.max(0, order.target - (order.completed + order.wip))
                    const isCritical = gap > order.target * 0.3

                    return (
                        <DialogTrigger asChild key={order.id}>
                            <Card 
                                className={cn(
                                    'group relative cursor-pointer rounded-2xl md:rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]',
                                    isCritical ? 'bg-rose-500/2 hover:bg-white' : 'bg-background/60 hover:bg-white'
                                )}
                                onClick={() => setSelectedOrder(order)}
                            >
                                {/* Status Edge Indicator */}
                                <div className={cn(
                                    'absolute top-0 left-0 bottom-0 w-1',
                                    gap === 0 ? 'bg-emerald-500' : isCritical ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                                )} />

                                <CardContent className='p-4 md:p-6'>
                                    <div className='flex flex-col gap-5 md:gap-6'>
                                        {/* Header Info */}
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex flex-col gap-0.5 min-w-0'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='text-[7px] md:text-[8px] font-mono font-black text-muted-foreground/30 uppercase tracking-widest leading-none shrink-0'>
                                                        {t('dashboard.page.reports.labels.batch')}
                                                    </span>
                                                    <span className='text-[9px] font-black italic text-primary/40 truncate shrink'>#{order.orderNo}</span>
                                                </div>
                                                <h3 className='text-xs md:text-sm font-black italic uppercase tracking-tighter text-secondary group-hover:text-primary transition-colors truncate max-w-[140px] md:max-w-[200px]'>
                                                    {order.customer}
                                                </h3>
                                            </div>
                                            <div className='flex flex-col items-end gap-0.5 shrink-0'>
                                                <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                                                    {t('dashboard.page.reports.labels.target')}
                                                </span>
                                                <div className='flex items-center gap-1.5'>
                                                    <Zap className={cn('size-3', isCritical ? 'text-rose-500' : 'text-blue-500')} />
                                                    <span className='text-base md:text-lg font-black tabular-nums tracking-tighter italic'>{order.target}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Advanced Progress Bar */}
                                        <div className='space-y-3'>
                                            <div className='flex h-2.5 w-full overflow-hidden rounded-full bg-muted/20 border border-muted/10 p-0.5 shadow-inner'>
                                                <div
                                                    className='bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                                    style={{ width: `${completedPct}%` }}
                                                />
                                                <div
                                                    className='bg-blue-500/40 rounded-full transition-all duration-1000 ease-out'
                                                    style={{ width: `${wipPct}%` }}
                                                />
                                            </div>

                                            {/* Detailed Metrics */}
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-4 md:gap-6'>
                                                    <div className='flex flex-col gap-0.5'>
                                                        <span className='text-[7px] font-black text-muted-foreground/30 uppercase tracking-widest leading-none'>
                                                            {t('dashboard.page.reports.labels.real')}
                                                        </span>
                                                        <span className='text-[10px] font-black text-emerald-600 tabular-nums'>{order.completed}</span>
                                                    </div>
                                                    <div className='flex flex-col gap-0.5'>
                                                        <span className='text-[7px] font-black text-muted-foreground/30 uppercase tracking-widest leading-none'>
                                                            {t('dashboard.page.reports.labels.wip')}
                                                        </span>
                                                        <div className='flex items-center gap-1'>
                                                            <span className='text-[10px] font-black text-blue-500 tabular-nums animate-pulse'>{order.wip}</span>
                                                            <Activity className='size-2.5 text-blue-400' />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='flex flex-col items-end gap-0.5'>
                                                    <span className='text-[7px] font-black text-muted-foreground/30 uppercase tracking-widest leading-none'>
                                                        {t('dashboard.page.reports.labels.gap')}
                                                    </span>
                                                    <span className={cn(
                                                        'text-[10px] font-black tabular-nums italic',
                                                        gap > 0 ? 'text-rose-500' : 'text-emerald-500'
                                                    )}>
                                                        {gap === 0 ? t('dashboard.page.reports.labels.done') : `-${gap}`}
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

                <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Order Blueprint</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="w-full h-full p-4 overflow-hidden">
                             <BlueprintLab orderNo={selectedOrder.orderNo} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

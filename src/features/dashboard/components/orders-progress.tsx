import { useState, useEffect } from 'react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProductionCalendarService, type OrderProgress } from '@/features/production-calendar/services/production-calendar-service'
import { PackageSearch, Activity, Zap, TriangleAlert, Compass } from 'lucide-react'
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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from 'recharts'

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

    // 动态拟合瓶颈延迟小时数
    const bottleneckData = orders.slice(0, 5).map(order => {
        const gap = Math.max(0, order.target - (order.completed + order.wip))
        const delayValue = Math.max(6, Math.round(gap * 0.18 + (order.wip * 0.05)))
        return {
            name: `批次 #${order.orderNo}`,
            delay: delayValue,
        }
    })

    return (
        <div className='animate-in fade-in duration-700'>
            <Dialog 
                open={!!selectedOrder} 
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            >
                <div className='grid grid-cols-1 lg:grid-cols-12 gap-3.5'>
                    
                    {/* Left Column: Order Delivery Lists (col-span-7) */}
                    <div className='lg:col-span-7 flex flex-col gap-3'>
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
                                            'group relative cursor-pointer rounded-[24px] border border-dashed border-muted/30 overflow-hidden transition-all duration-500 hover:shadow-lg hover:scale-[1.005]',
                                            isCritical ? 'bg-rose-500/2 hover:bg-white' : 'bg-background/60 hover:bg-white'
                                        )}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                                        
                                        {/* Status Edge Indicator */}
                                        <div className={cn(
                                            'absolute top-0 left-0 bottom-0 w-1',
                                            gap === 0 ? 'bg-emerald-500' : isCritical ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                                        )} />

                                        <CardContent className='p-3.5 z-10 relative'>
                                            <div className='flex flex-col gap-4'>
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
                                                <div className='space-y-2'>
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
                    </div>

                    {/* Right Column: Delay Bottleneck Diagnosis Chart (col-span-5) */}
                    <div className='lg:col-span-5 flex flex-col gap-3.5'>
                        <Card className='rounded-[24px] border border-dashed border-muted/30 bg-muted/5 shadow-none overflow-hidden relative p-4 flex flex-col justify-between h-full'>
                            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                            <div>
                                <CardHeader className='p-0 pb-3 border-b border-dashed border-muted/30 z-10'>
                                    <CardTitle className='text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5 text-rose-500'>
                                        <Compass className='size-4 animate-spin-slow' />
                                        交付排产延时瓶颈诊断
                                    </CardTitle>
                                    <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                        PRODUCTION_DELAY_BOTTLENECK / 交付缺口与流转阻塞分析
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='p-0 pt-6 z-10 relative h-[280px]'>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bottleneckData} layout="vertical" margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                                            <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '8px', padding: '4px' }} />
                                            <Bar dataKey="delay" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10}>
                                                {bottleneckData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.delay > 15 ? '#ef4444' : '#f59e0b'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </div>
                            <div className='border-t border-dashed border-muted/30 pt-3 mt-4 text-[9px] font-black text-muted-foreground/50 flex justify-between items-center z-10'>
                                <span>已诊断瓶颈批次: {bottleneckData.length} 批</span>
                                <span className='text-rose-500 hover:underline cursor-pointer'>瓶颈自愈调停 &rarr;</span>
                            </div>
                        </Card>
                    </div>

                </div>

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

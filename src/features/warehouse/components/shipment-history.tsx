'use client'

import { History as HistoryIcon, Send, Trash2, RotateCcw, Link as LinkIcon, Database } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import type { ShipmentRecord, MasterDataSearchResult } from '../services/inventory-service'
import { ApprovalGuard } from '@/features/approval/components/approval-guard'
import { useAuthStore } from '@/stores/auth-store'

type WarehouseCategoryOption = {
    value: string
    label: string
}

interface ShipmentHistoryProps {
    history: ShipmentRecord[]
    activeTab: string
    setActiveTab: (tab: string) => void
    masterDataMap: Record<string, MasterDataSearchResult>
    warehouseCategories: WarehouseCategoryOption[]
    onCommit: (id: string, name: string) => void
    onRemove: (id: string, name: string, quantity: number, status: string, token?: string) => void
    highlightId?: string
}

export function ShipmentHistory({
    history,
    activeTab,
    setActiveTab,
    masterDataMap,
    warehouseCategories,
    onCommit,
    onRemove,
    highlightId
}: ShipmentHistoryProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const user = useAuthStore((state) => state.user)
    const canOpenTradingLogistics = canOpenRouteEntryNonBlocking(user, '/trading/logistics')
    const filteredHistory = activeTab === 'all'
        ? history
        : history.filter(h => h.status === activeTab)

    return (
        <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-1 md:px-4'>
                <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full sm:w-auto'>
                    <TabsList className='bg-muted/30 p-1 rounded-xl md:rounded-2xl h-10 md:h-11 border border-dashed border-muted/50 w-full overflow-x-auto scrollbar-hide flex justify-start sm:justify-center'>
                        <TabsTrigger value='all' className='rounded-lg md:rounded-xl px-4 md:px-6 font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-md italic'>
                            {t('warehouse.shipment.history.all')}
                        </TabsTrigger>
                        <TabsTrigger value='DRAFT' className='rounded-lg md:rounded-xl px-4 md:px-6 font-black text-[9px] md:text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-md italic'>
                            {t('warehouse.shipment.history.draft')}
                            <Badge className='h-3.5 md:h-4 px-1 text-[7px] md:text-[8px] font-black bg-amber-500/10 text-amber-600 border-none'>
                                {history.filter(h => h.status === 'DRAFT').length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value='COMMITTED' className='rounded-lg md:rounded-xl px-4 md:px-6 font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-md italic shrink-0'>
                            {t('warehouse.shipment.history.committed')}
                        </TabsTrigger>
                        <TabsTrigger value='VOID' className='rounded-lg md:rounded-xl px-4 md:px-6 font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-rose-500 data-[state=active]:shadow-md italic shrink-0'>
                            {t('warehouse.shipment.history.void')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className='flex items-center gap-3 self-end sm:self-auto'>
                    <div className='px-3 md:px-4 py-1.5 md:py-2 bg-muted/20 rounded-xl border border-dashed border-muted/50 flex flex-col items-end'>
                        <span className='text-[7px] md:text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('warehouse.shipment.history.traceNodes')}</span>
                        <span className='text-[10px] md:text-[12px] font-black tabular-nums'>{t('warehouse.shipment.history.itemCount', { count: history.length })}</span>
                    </div>
                </div>
            </div>

            <div className='overflow-x-auto scrollbar-hide'>
                <table className='min-w-[900px] md:min-w-full text-sm border-separate border-spacing-y-2 px-1'>
                    <thead>
                        <tr className='bg-muted/5'>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.idStatus')}</th>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.nodeContext')}</th>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.quantity')}</th>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.sourceArea')}</th>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.timestamp')}</th>
                            <th className='px-4 md:px-6 py-3 md:py-4 text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.history.columns.control')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length > 0 ? (
                            filteredHistory.map((record) => {
                                const item = masterDataMap[record.materialId]
                                const isHighlighted = record.id === highlightId
                                return (
                                    <tr
                                        key={record.id}
                                        className={cn(
                                            'group cursor-default transition-all duration-300 hover:translate-x-1',
                                            isHighlighted ? 'bg-white ring-2 ring-primary/20 shadow-xl' : 'bg-white/50 hover:bg-white border-y border-dashed border-muted/50'
                                        )}
                                    >
                                        <td className='px-4 md:px-6 py-3 md:py-4 rounded-l-xl md:rounded-l-2xl border-l-[3px] md:border-l-4 border-l-transparent group-hover:border-l-primary/30 transition-colors'>
                                            <div className='flex flex-col gap-1 md:gap-1.5'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest'>#{record.id.slice(-6)}</span>
                                                    {isHighlighted && <div className='size-1 md:size-1.5 rounded-full bg-primary animate-ping' />}
                                                </div>
                                                <div className='flex'>
                                                    {record.status === 'DRAFT' && <Badge className='text-[7px] md:text-[8px] font-black uppercase bg-amber-500/10 text-amber-600 border-none h-3.5 md:h-4 px-1.5 rounded-full'>{t('warehouse.shipment.history.draft')}</Badge>}
                                                    {record.status === 'COMMITTED' && <Badge className='text-[7px] md:text-[8px] font-black uppercase bg-blue-500/10 text-blue-600 border-none h-3.5 md:h-4 px-1.5 rounded-full tracking-tighter shrink-0'>{t('warehouse.shipment.history.committed')}</Badge>}
                                                    {record.status === 'VOID' && <Badge className='text-[7px] md:text-[8px] font-black uppercase bg-rose-500/10 text-rose-400 border-none h-3.5 md:h-4 px-1.5 rounded-full line-through'>{t('warehouse.shipment.history.void')}</Badge>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className='px-4 md:px-6 py-3 md:py-4'>
                                            <div className='flex flex-col overflow-hidden max-w-[150px] md:max-w-none'>
                                                <span className='font-black text-[12px] md:text-[13px] text-slate-700 tracking-tight uppercase group-hover:text-primary transition-colors truncate'>{item?.name || t('warehouse.shipment.history.masterRecord')}</span>
                                                <span className='text-[8px] md:text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest truncate'>{item?.code || 'SKU'}</span>
                                            </div>
                                        </td>
                                        <td className='px-4 md:px-6 py-3 md:py-4'>
                                            <div className='flex items-center gap-2 md:gap-3'>
                                                <div className={cn('w-1 h-3 rounded-full shrink-0', record.status === 'VOID' ? 'bg-muted' : 'bg-primary/40 group-hover:bg-primary transition-colors')} />
                                                <span className={cn(
                                                    'font-mono text-sm md:text-[16px] font-black tabular-nums tracking-tighter shrink-0',
                                                    record.status === 'VOID' ? 'text-slate-300' : 'text-primary'
                                                )}>
                                                    -{record.quantity.toLocaleString()} <span className='text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-40'>{item?.uom || t('warehouse.shipment.history.units')}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className='px-4 md:px-6 py-3 md:py-4'>
                                            <Badge variant='outline' className='font-black text-[7px] md:text-[8px] uppercase tracking-widest bg-muted/20 border-none h-4 md:h-5 px-2 md:px-3 rounded-lg md:rounded-xl text-slate-500 whitespace-nowrap'>
                                                {warehouseCategories.find(c => c.value === record.sourceCategory)?.label || record.sourceCategory}
                                            </Badge>
                                        </td>
                                        <td className='px-4 md:px-6 py-3 md:py-4 text-[8px] md:text-[9px] font-mono font-bold text-muted-foreground/40 whitespace-nowrap'>{record.shipmentDate}</td>
                                        <td className='px-4 md:px-6 py-3 md:py-4 text-right rounded-r-xl md:rounded-r-2xl'>
                                            <div className='flex justify-end gap-1.5 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100'>
                                                {record.status === 'DRAFT' && (
                                                    <>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-7 md:h-8 px-3 md:px-4 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10'
                                                            onClick={() => onCommit(record.id, item?.name || t('warehouse.shipment.history.draft'))}
                                                        >
                                                            <Send className='size-2 md:size-2.5 mr-1 md:mr-2' /> {t('warehouse.shipment.history.submit')}
                                                        </Button>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-7 md:h-8 px-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-500/5 transition-colors'
                                                            onClick={() => onRemove(record.id, item?.name || t('warehouse.shipment.history.draft'), record.quantity, record.status)}
                                                        >
                                                            <Trash2 className='size-3 md:size-3.5' />
                                                        </Button>
                                                    </>
                                                )}
                                                {record.status === 'COMMITTED' && (
                                                    <div className='flex gap-1.5'>
                                                        {canOpenTradingLogistics ? (
                                                            <Button
                                                                variant='ghost'
                                                                size='sm'
                                                                className='h-7 md:h-8 px-3 md:px-4 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10'
                                                                onClick={() => router.navigate({
                                                                    to: '/trading/logistics',
                                                                    search: { bindOrderNo: record.orderNo, bindShipmentId: record.id }
                                                                })}
                                                            >
                                                                <LinkIcon className='size-2 md:size-2.5 mr-1 md:mr-2' /> {t('warehouse.shipment.history.trace')}
                                                            </Button>
                                                        ) : null}
                                                        <ApprovalGuard
                                                            module='Inventory'
                                                            action='VOID'
                                                            targetId={record.id}
                                                            onApproved={(token) => onRemove(record.id, item?.name || t('warehouse.shipment.history.masterRecord'), record.quantity, record.status, token)}
                                                        >
                                                            <Button
                                                                variant='ghost'
                                                                size='sm'
                                                                className='h-7 md:h-8 px-3 md:px-4 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-lg shadow-red-500/10'
                                                            >
                                                                <RotateCcw className='size-2 md:size-2.5 mr-1 md:mr-2' /> {t('warehouse.shipment.history.markVoid')}
                                                            </Button>
                                                        </ApprovalGuard>
                                                    </div>
                                                )}
                                                {record.status === 'VOID' && (
                                                    <span className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 pr-2 md:pr-4 flex items-center gap-1 md:gap-2'>
                                                        <Database className='size-2.5 md:size-3' /> {t('warehouse.shipment.history.locked')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className='h-48 text-center bg-muted/5 rounded-[32px] border border-dashed border-muted/50 mt-4'>
                                    <div className='flex flex-col items-center justify-center gap-4 opacity-20'>
                                        <HistoryIcon className='size-16' />
                                        <p className='text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground italic'>{t('warehouse.shipment.history.empty')}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

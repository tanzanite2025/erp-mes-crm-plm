'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RefreshCw, FileText, Printer, CheckCircle2, History, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { auditUtils } from '@/lib/audit-utils'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'

import { AdjustmentPrint } from '../components/adjustment-print'
import { AdjustmentService, type InventoryAdjustment } from '../adjustment'
import { warehouseQueryKeys } from '../query-keys'
import { getAdjustmentStatusMeta } from '../utils/warehouse-status-display'

export function AdjustmentHistory() {
    const queryClient = useQueryClient()
    const { t } = useLanguage()
    const [selectedAdj, setSelectedAdj] = useState<InventoryAdjustment | null>(null)
    const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false)
    const [adjToExecute, setAdjToExecute] = useState<InventoryAdjustment | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    const { data: adjustments, isLoading, error } = useQuery({
        queryKey: warehouseQueryKeys.inventoryAdjustments(),
        queryFn: () => AdjustmentService.getHistory()
    })

    const handlePrint = () => {
        window.print()
    }

    const executeMutation = useMutation({
        mutationFn: (id: string) => AdjustmentService.execute(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAdjustments() })
            toast.success(t('warehouse.adjustment.toast.executeSuccess'))
            setExecuteConfirmOpen(false)
            setAdjToExecute(null)
        },
        onError: (err: Error) => {
            toast.error(t('warehouse.adjustment.toast.executeFailed', { message: err.message }))
        }
    })

    const handleExecuteClick = (adj: InventoryAdjustment) => {
        setAdjToExecute(adj)
        setExecuteConfirmOpen(true)
    }

    const onConfirmExecute = async () => {
        if (!adjToExecute) return
        executeMutation.mutate(adjToExecute.id)
    }

    const executeConfirmDesc = `${adjToExecute?.adjustmentNo || ''} - ${t('warehouse.stock.toast.reconcileConfirm')}`

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <PageHeader title={t('warehouse.adjustment.title')} description={t('warehouse.adjustment.subtitle')} icon={FileText} />

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 bg-muted/10 px-3 md:px-4 py-2 rounded-full border border-dashed border-muted/50 w-full sm:w-auto overflow-hidden'>
                    <Search className='size-3 md:size-3.5 shrink-0' />
                    <span className='truncate'>{t('warehouse.adjustment.filter')}</span>
                </div>
                <div className='flex items-center gap-3 justify-end'>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => { void queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAdjustments() }) }}
                        className='size-9 md:size-10 rounded-full hover:bg-muted shrink-0'
                    >
                        <RefreshCw className={cn('size-3.5 md:size-4 text-muted-foreground', isLoading && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            <div className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
                <div className='px-5 md:px-8 py-4 md:py-5 border-b border-dashed border-muted/50 flex items-center justify-between bg-muted/20'>
                    <div className='flex items-center gap-2 overflow-hidden'>
                        <History className='size-4 text-amber-600 shrink-0' />
                        <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase text-slate-800 truncate'>{t('warehouse.adjustment.flowTitle')}</h3>
                    </div>
                    <p className='hidden sm:block text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>{t('warehouse.adjustment.auditData')}</p>
                </div>
                <div className='p-0 overflow-x-auto scrollbar-hide'>
                    <ScrollArea className='h-[600px]'>
                        <Table className='min-w-[800px] md:min-w-0'>
                            <TableHeader className='bg-muted/30 h-12 md:h-14'>
                                <TableRow className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                    <TableHead className='pl-5 md:pl-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.orderId')}</TableHead>
                                    <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.type')}</TableHead>
                                    <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.nodes')}</TableHead>
                                    <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.status')}</TableHead>
                                    <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.owner')}</TableHead>
                                    <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.timestamp')}</TableHead>
                                    <TableHead className='pr-5 md:pr-8 text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.adjustment.columns.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className='h-64 text-center'>
                                            <RefreshCw className='size-8 text-amber-600 animate-spin mx-auto opacity-20' />
                                        </TableCell>
                                    </TableRow>
                                ) : adjustments?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className='h-64 text-center'>
                                            <Search className='size-12 opacity-5 mx-auto mb-4' />
                                            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.adjustment.empty')}</p>
                                        </TableCell>
                                    </TableRow>
                                ) : adjustments?.map((adj: InventoryAdjustment) => {
                                    const ownerName = auditUtils.formatOperatorName(adj.createdBy) || adj.createdBy
                                    return (
                                    <TableRow key={adj.id} className='hover:bg-muted/30 transition-colors border-muted/50 group'>
                                        <TableCell className='pl-5 md:pl-8 py-2 md:py-2.5 font-mono text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors truncate max-w-[120px]'>{adj.adjustmentNo}</TableCell>
                                        <TableCell>
                                            <Badge variant='outline' className='font-black text-[8px] md:text-[9px] uppercase tracking-widest bg-muted border-none h-4 md:h-5 px-2 md:px-3 rounded-full whitespace-nowrap'>
                                                {adj.type === 'STOCKTAKE' ? t('warehouse.adjustment.typeStocktake') : t('warehouse.adjustment.typeManual')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className='font-black text-[11px] md:text-[12px] text-slate-500 uppercase tracking-tight whitespace-nowrap'>{adj.totalItems}</TableCell>
                                        <TableCell>
                                            <AuditStatusDisplay
                                                meta={getAdjustmentStatusMeta(t, adj.status)}
                                                badgeClassName='h-5 px-3'
                                            />
                                        </TableCell>
                                        <TableCell className='py-2 md:py-2.5 whitespace-nowrap'>
                                            <div className='flex flex-col gap-1'>
                                                <span className='font-bold text-[10px] md:text-[11px] text-slate-600'>{ownerName}</span>
                                                <span className='text-[8px] md:text-[9px] text-muted-foreground/50'>
                                                    {t('warehouse.adjustment.audit.approvedBy')}: {adj.approvedBy || t('warehouse.adjustment.audit.empty')}
                                                </span>
                                                <span className='text-[8px] md:text-[9px] text-muted-foreground/50'>
                                                    {t('warehouse.adjustment.audit.executedBy')}: {adj.executedBy || t('warehouse.adjustment.audit.empty')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='py-2 md:py-2.5 font-mono text-[8px] md:text-[9px] text-muted-foreground/40 whitespace-nowrap'>
                                            <div className='flex flex-col gap-1'>
                                                <span>{format(new Date(adj.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                                                <span>{t('warehouse.adjustment.audit.approvedAt')}: {adj.approvedAt ? format(new Date(adj.approvedAt), 'yyyy-MM-dd HH:mm') : t('warehouse.adjustment.audit.empty')}</span>
                                                <span>{t('warehouse.adjustment.audit.executedAt')}: {adj.executedAt ? format(new Date(adj.executedAt), 'yyyy-MM-dd HH:mm') : t('warehouse.adjustment.audit.empty')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='pr-5 md:pr-8 py-2 md:py-2.5 text-right space-x-2 whitespace-nowrap'>
                                            {adj.status === 'APPROVED' && (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='h-8 md:h-9 px-3 md:px-4 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10'
                                                    onClick={() => handleExecuteClick(adj)}
                                                >
                                                    <CheckCircle2 className='size-3 mr-1.5 md:mr-2' /> {t('warehouse.adjustment.execute')}
                                                </Button>
                                            )}
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                className='h-8 md:h-9 px-3 md:px-4 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest gap-2 bg-muted/50 hover:bg-muted'
                                                onClick={() => setSelectedAdj(adj)}
                                            >
                                                <Printer className='size-3' /> {t('warehouse.adjustment.print')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>

            <Dialog open={!!selectedAdj} onOpenChange={(open) => !open && setSelectedAdj(null)}>
                <DialogContent className='w-[95vw] sm:max-w-[900px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                    <div className='absolute inset-0 bg-linear-to-br from-amber-600/5 via-transparent pointer-events-none' />

                    <div className='relative p-5 md:p-8'>
                        <DialogHeader className='mb-4 md:mb-6 print:hidden text-left'>
                            <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase flex items-center gap-3 md:gap-4 truncate'>
                                <div className='size-8 md:size-10 rounded-lg md:rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0'>
                                    <Printer className='size-4 md:size-5 text-amber-600' />
                                </div>
                                {t('warehouse.adjustment.previewTitle')}
                            </DialogTitle>
                            <DialogDescription className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1 block truncate'>
                                {t('warehouse.adjustment.previewSubtitle')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className='rounded-xl md:rounded-[24px] border border-dashed border-muted bg-white p-4 md:p-8 mb-6 md:mb-8 overflow-y-auto max-h-[50vh] md:max-h-[60vh] shadow-inner'>
                            {selectedAdj && (
                                <div className='print-content scale-[0.85] origin-top md:scale-100'>
                                    <AdjustmentPrint data={selectedAdj} ref={printRef} />
                                </div>
                            )}
                        </div>

                        <DialogFooter className='bg-transparent flex flex-row items-center justify-end gap-3 md:gap-4 print:hidden'>
                            <Button
                                variant='ghost'
                                className='flex-1 sm:flex-none h-10 md:h-12 rounded-full hover:bg-muted font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-colors px-4 md:px-8'
                                onClick={() => setSelectedAdj(null)}
                            >
                                {t('warehouse.adjustment.close')}
                            </Button>
                            <Button
                                className='flex-1 sm:flex-none h-10 md:h-12 rounded-full shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2 px-4 md:px-8'
                                onClick={handlePrint}
                            >
                                <Printer className='size-3.5 md:size-4' /> {t('warehouse.adjustment.print')}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={executeConfirmOpen}
                onOpenChange={setExecuteConfirmOpen}
                title={t('warehouse.adjustment.execute')}
                desc={executeConfirmDesc}
                handleConfirm={onConfirmExecute}
                isLoading={executeMutation.isPending}
            />
        </div>
    )
}

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, PackageSearch, RefreshCw, Send, AlertCircle, History, Database, Search } from 'lucide-react'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { failLoudly } from '@/lib/safe-catch'
import { auditUtils } from '@/lib/audit-utils'

import { useStocktake, useStocktakeItems } from '../hooks/use-stock-maintenance'
import { useWarehouseCategoryOptions } from '../hooks/use-warehouse-category'
import { warehouseQueryKeys } from '../query-keys'
import { StocktakeMaintenanceService, type StocktakeItem, type StocktakeTask } from '../stocktake'
import { filterWarehouseCategoriesByScene } from '../utils/warehouse-category-config'
import { getStocktakeStatusMeta } from '../utils/warehouse-status-display'

export function StocktakeMgmt() {
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    
    const queryClient = useQueryClient()
    const { 
        tasks, 
        isLoading, 
        isError: error,
        refreshData,
        createStocktake,
        isCreating 
    } = useStocktake()

    const categoriesQuery = useWarehouseCategoryOptions()
    const stocktakeCategories = useMemo(() => {
        if (categoriesQuery.isLoading) return []
        if (!categoriesQuery.data) {
            const lookupError = categoriesQuery.error instanceof Error
                ? categoriesQuery.error
                : new Error('[CRITICAL] Stocktake warehouse categories missing after load')
            failLoudly(lookupError, 'StocktakeMgmt.categories')
            throw lookupError
        }

        const filteredCategories = filterWarehouseCategoriesByScene(categoriesQuery.data, 'stocktake')
        if (filteredCategories.length === 0) {
            const lookupError = new Error('[CRITICAL] No warehouse categories allowed for stocktake scene')
            failLoudly(lookupError, 'StocktakeMgmt.categories')
            throw lookupError
        }

        return filteredCategories
    }, [categoriesQuery.data, categoriesQuery.error, categoriesQuery.isLoading])

    const [selectedTask, setSelectedTask] = useState<StocktakeTask | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [adjustmentConfirmOpen, setAdjustmentConfirmOpen] = useState(false)
    const selectedTaskId = selectedTask?.id

    const { data: items, isLoading: itemsLoading } = useStocktakeItems(selectedTaskId || null)

    const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!allowsAction('action_warehouse_stocktake_manage')) return
        const formData = new FormData(e.currentTarget)
        try {
            await createStocktake({
                title: formData.get('title') as string,
                warehouseCategoryCode: formData.get('category') as string,
                remarks: formData.get('remarks') as string
            })
            setIsCreateOpen(false)
        } catch (_error) {
            // Already handled in hook toast
        }
    }

    const postAdjustmentMutation = useMutation({
        mutationFn: (taskId: string) => StocktakeMaintenanceService.submitAdjustmentForApproval(taskId),
        onSuccess: async (_, taskId) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeItems(taskId) }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAdjustments() }),
            ])
            toast.success(t('warehouse.stocktake.toast.postSuccess'))
        },
        onError: (err: Error) => {
            toast.error(t('warehouse.stocktake.toast.postFailed', { message: err.message }))
        }
    })

    const handlePostAdjustment = () => {
        if (!selectedTask) return
        if (!allowsAction('action_warehouse_adjustment_submit')) return
        setAdjustmentConfirmOpen(true)
    }

    const onConfirmAdjustment = async () => {
        if (!selectedTask) return
        try {
            await postAdjustmentMutation.mutateAsync(selectedTask.id)
            setAdjustmentConfirmOpen(false)
        } catch (error) {
            failLoudly(error, 'StocktakeMgmt.onConfirmAdjustment', { silentUI: true })
        }
    }

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <PageHeader title={t('warehouse.stocktake.title')} description={t('warehouse.stocktake.subtitle')} icon={PackageSearch} />

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 bg-muted/10 px-3 md:px-4 py-2 rounded-full border border-dashed border-muted/50 w-full sm:w-auto overflow-hidden'>
                    <AlertCircle className='size-3 md:size-3.5 shrink-0' />
                    <span className='truncate'>{t('warehouse.stocktake.autoFreeze')}</span>
                </div>
                <div className='flex items-center gap-2 md:gap-3 justify-end'>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => { void refreshData() }}
                        className='size-9 md:size-10 rounded-full hover:bg-muted shrink-0'
                    >
                        <RefreshCw className={cn('size-3.5 md:size-4 text-muted-foreground', isLoading && 'animate-spin')} />
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className='h-10 md:h-11 px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2 shrink-0'>
                                <Plus className='size-3.5 md:size-4' />
                                <span className='truncate'>{t('warehouse.stocktake.initiate')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                            <div className='absolute inset-0 bg-linear-to-br from-blue-600/5 via-transparent pointer-events-none' />
                            <form onSubmit={handleCreateTask} className='relative p-5 md:p-8'>
                                <DialogHeader className='mb-6 md:mb-8 text-left'>
                                    <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase truncate'>
                                        {t('warehouse.stocktake.createDialog.title')}
                                    </DialogTitle>
                                    <p className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 truncate'>
                                        {t('warehouse.stocktake.createDialog.subtitle')}
                                    </p>
                                </DialogHeader>

                                <div className='space-y-4 md:space-y-6'>
                                    <div className='space-y-2 md:space-y-3'>
                                        <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                            {t('warehouse.stocktake.createDialog.sessionTitleLabel')}
                                        </Label>
                                        <Input
                                            name='title'
                                            placeholder={t('warehouse.stocktake.createDialog.sessionTitlePlaceholder')}
                                            required
                                            className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner text-xs md:text-sm'
                                        />
                                    </div>
                                    <div className='space-y-2 md:space-y-3'>
                                        <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                            {t('warehouse.stocktake.createDialog.scopeLabel')}
                                        </Label>
                                        <Select name='category' required>
                                            <SelectTrigger className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus:ring-blue-600 shadow-inner text-xs md:text-sm'>
                                                <SelectValue placeholder={t('warehouse.stocktake.createDialog.selectCategory')} />
                                            </SelectTrigger>
                                            <SelectContent className='rounded-xl shadow-2xl border-none p-1 md:p-2'>
                                                {stocktakeCategories.length === 0 ? (
                                                    <SelectItem value='_' disabled className='text-[9px] md:text-[10px]'>
                                                        {t('warehouse.stocktake.createDialog.noCategories')}
                                                    </SelectItem>
                                                ) : (
                                                    stocktakeCategories.map((cat: { code: string, name: string }) => (
                                                        <SelectItem key={cat.code} value={cat.code} className='rounded-lg font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-2.5'>
                                                            {cat.name} ({cat.code})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <div className='bg-amber-500/5 rounded-xl p-2.5 md:p-3 border border-dashed border-amber-500/20 flex gap-2 md:gap-2.5 items-start'>
                                            <AlertCircle className='size-3 md:size-3.5 text-amber-500 shrink-0 mt-0.5' />
                                            <p className='text-[8px] md:text-[9px] text-amber-600/80 font-bold leading-relaxed uppercase tracking-widest'>
                                                {t('warehouse.stocktake.createDialog.freezeHint')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='space-y-2 md:space-y-3'>
                                        <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                            {t('warehouse.stocktake.createDialog.remarksLabel')}
                                        </Label>
                                        <Input
                                            name='remarks'
                                            placeholder={t('warehouse.stocktake.createDialog.remarksPlaceholder')}
                                            className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner text-xs md:text-sm'
                                        />
                                    </div>
                                </div>
                                <div className='mt-6 md:mt-8 flex gap-4'>
                                    <Button
                                        type='submit'
                                        disabled={isCreating}
                                        className='flex-1 h-10 md:h-11 rounded-full shadow-lg shadow-blue-500/20 bg-blue-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95'
                                    >
                                        {isCreating ? t('warehouse.stocktake.createDialog.creating') : t('warehouse.stocktake.createDialog.start')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className='flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start'>
                <div className='w-full lg:col-span-4 relative rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6 transition-all hover:bg-muted/10 h-fit shadow-inner'>
                    <div className='absolute top-0 left-6 md:left-12 -translate-y-1/2 bg-background px-3 md:px-4 py-1 border border-dashed border-muted/80 rounded-full flex items-center gap-2'>
                        <History className='size-3 text-muted-foreground/60' />
                        <span className='text-[8px] md:text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase italic truncate'>{t('warehouse.stocktake.queueTitle')}</span>
                    </div>

                    <ScrollArea className='h-auto max-h-[400px] lg:max-h-[650px] lg:h-[650px] pr-2 md:pr-4'>
                        {tasks?.length === 0 ? (
                            <div className='py-20 flex flex-col items-center justify-center text-center'>
                                <Database className='size-12 opacity-5 mb-4' />
                                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.stocktake.noTasks')}</p>
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                {tasks?.map((task) => {
                                    const creatorName = auditUtils.formatOperatorName(task.createdBy) || task.createdBy
                                    return (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={cn(
                                            'group relative p-5 rounded-[24px] border border-muted/60 transition-all cursor-pointer',
                                            selectedTask?.id === task.id
                                                ? 'bg-background shadow-xl border-blue-500/50 scale-[1.02] ring-4 ring-blue-500/5'
                                                : 'bg-background/40 hover:bg-background/60 hover:shadow-lg hover:border-blue-500/30'
                                        )}
                                    >
                                        <div className='flex justify-between items-start mb-3'>
                                            <h4 className='font-black text-slate-800 tracking-tighter uppercase text-sm group-hover:text-blue-600 transition-colors italic'>
                                                {task.title}
                                            </h4>
                                            <div className='scale-75 origin-top-right'>
                                                <AuditStatusDisplay
                                                    meta={getStocktakeStatusMeta(t, task.status)}
                                                    badgeClassName='h-5 px-3'
                                                />
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-4 mt-4 pt-4 border-t border-dashed border-muted/50'>
                                            <div className='flex flex-col'>
                                                <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest'>{t('warehouse.stocktake.areaCode')}</span>
                                                <span className='text-[10px] font-black font-mono text-slate-500'>{task.warehouseCategoryCode}</span>
                                            </div>
                                            <div className='flex flex-col ml-auto text-right'>
                                                <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest'>{t('warehouse.stocktake.creator')}</span>
                                                <span className='text-[10px] font-black text-slate-500'>{creatorName}</span>
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className='w-full lg:col-span-8 relative'>
                    {selectedTask ? (
                        <div className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
                            <div className='px-5 md:px-8 py-4 md:py-6 border-b border-dashed border-muted/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-muted/20 gap-4'>
                                <div className='space-y-0.5 overflow-hidden'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-1 h-4 md:h-5 bg-blue-600 rounded-full shrink-0' />
                                        <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase text-slate-800 truncate'>{selectedTask.title}</h3>
                                    </div>
                                    <p className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ml-[16px] truncate'>
                                        {t('warehouse.stocktake.detailSubtitle', { count: items?.length || 0 })}
                                    </p>
                                </div>
                                {(selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'COMPLETED') && (
                                    <Button
                                        onClick={handlePostAdjustment}
                                        disabled={postAdjustmentMutation.isPending}
                                        className='h-9 md:h-10 px-4 md:px-6 rounded-full shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2 shrink-0 self-start sm:self-auto'
                                    >
                                        <Send className='size-3 md:size-3.5' /> {t('warehouse.stocktake.submitRecon')}
                                    </Button>
                                )}
                            </div>

                            <div className='p-0 overflow-x-auto scrollbar-hide'>
                                <ScrollArea className='h-auto max-h-[620px] lg:h-[620px]'>
                                    <Table className='min-w-[700px] md:min-w-0'>
                                        <TableHeader className='bg-muted/30 h-12 md:h-14'>
                                            <TableRow className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                                <TableHead className='pl-5 md:pl-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stocktake.columns.nodeContext')}</TableHead>
                                                <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stocktake.columns.batch')}</TableHead>
                                                <TableHead className='text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stocktake.columns.theory')}</TableHead>
                                                <TableHead className='text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stocktake.columns.actual')}</TableHead>
                                                <TableHead className='pr-5 md:pr-8 text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stocktake.columns.variance')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {itemsLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className='h-64 text-center'>
                                                        <RefreshCw className='size-8 text-blue-600 animate-spin mx-auto opacity-20' />
                                                    </TableCell>
                                                </TableRow>
                                            ) : items?.map((item: StocktakeItem) => (
                                                <TableRow key={item.id} className='hover:bg-muted/30 transition-colors border-muted/50 group'>
                                                    <TableCell className='pl-5 md:pl-8 py-2 md:py-2.5'>
                                                        <div className='flex flex-col overflow-hidden max-w-[150px] md:max-w-none'>
                                                            <span className='font-bold text-[11px] md:text-[12px] text-slate-700 tracking-tight uppercase group-hover:text-blue-600 transition-colors truncate'>{item.materialName}</span>
                                                            <span className='text-[7px] md:text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest truncate'>{item.materialCode}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className='py-2 md:py-2.5'>
                                                        <span className='inline-flex h-3.5 items-center rounded-full bg-white px-1.5 md:px-2 font-black text-[7px] md:text-[8px] uppercase tracking-widest shadow-sm whitespace-nowrap'>
                                                            {item.batchNo || t('warehouse.stocktake.noBatch')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className='text-right py-2 md:py-2.5 font-mono text-[10px] md:text-[11px] font-bold text-slate-400 whitespace-nowrap'>
                                                        {item.theoryQty} <span className='text-[7px] uppercase tracking-tighter'>{item.uom}</span>
                                                    </TableCell>
                                                    <TableCell className='text-right py-2 md:py-2.5 font-mono text-xs md:text-sm font-black text-blue-600 whitespace-nowrap'>
                                                        {item.actualQty} <span className='text-[7px] uppercase tracking-tighter text-blue-400'>{item.uom}</span>
                                                    </TableCell>
                                                    <TableCell className='pr-5 md:pr-8 py-2 md:py-2.5 text-right'>
                                                        <div className={cn(
                                                            'inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-md font-mono font-black text-[9px] md:text-[10px]',
                                                            item.difference > 0 ? 'bg-emerald-500/10 text-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.1)]' :
                                                                item.difference < 0 ? 'bg-rose-500/10 text-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.1)]' :
                                                                    'bg-muted text-muted-foreground/30'
                                                        )}>
                                                            {item.difference > 0 ? '+' : ''}{item.difference}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    ) : (
                        <div className='h-auto min-h-[400px] lg:h-[734px] rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/40 bg-muted/5 flex flex-col items-center justify-center text-center p-8 md:p-12'>
                            <div className='relative mb-6 md:mb-8'>
                                <Search className='size-16 md:size-24 opacity-5' />
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <Database className='size-8 md:size-10 opacity-10 animate-pulse' />
                                </div>
                            </div>
                            <h4 className='text-lg md:text-xl font-black tracking-tighter uppercase text-muted-foreground/40 mb-2'>{t('warehouse.stocktake.idleTitle')}</h4>
                            <p className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 max-w-xs'>
                                {t('warehouse.stocktake.idleHint')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={adjustmentConfirmOpen}
                onOpenChange={setAdjustmentConfirmOpen}
                title={t('warehouse.adjustment.execute')}
                desc={t('warehouse.stocktake.toast.posting')} // Reuse or specific desc if needed
                confirmText={t('warehouse.stocktake.submitRecon')}
                handleConfirm={onConfirmAdjustment}
                isLoading={postAdjustmentMutation.isPending}
            />
        </div>
    )
}

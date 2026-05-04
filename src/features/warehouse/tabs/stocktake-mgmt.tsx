import { Plus, PackageSearch, RefreshCw, Send, AlertCircle, History, Database, Search } from 'lucide-react'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { auditUtils } from '@/lib/audit-utils'

import { type StocktakeItem } from '../stocktake'
import { useStocktakeMgmtViewModel } from '../hooks/use-stocktake-mgmt-view-model'
import { getStocktakeStatusMeta } from '../utils/warehouse-status-display'

export function StocktakeMgmt() {
    const { t } = useLanguage()
    const {
        readResource,
        itemsResource,
        tasks,
        isLoading,
        selectedTask,
        items,
        itemsLoading,
        stocktakeCategories,
        isCreateOpen,
        adjustmentConfirmOpen,
        isCreating,
        isSubmittingAdjustment,
        canSubmitAdjustment,
        handleRefresh,
        handleSelectTask,
        handleCreateDialogOpenChange,
        handleCreateTaskSubmit,
        handleRequestAdjustmentSubmission,
        handleAdjustmentConfirmOpenChange,
        handleConfirmAdjustmentSubmission,
        retryRead,
        retryItems,
    } = useStocktakeMgmtViewModel()

    if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
        return <ForbiddenState />
    }

    if (readResource.status === 'error') {
        return (
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <IndustrialHeader title={t('warehouse.stocktake.title')} description={t('warehouse.stocktake.subtitle')} icon={PackageSearch} />
                <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-rose-700'>盘点基础数据加载失败</p>
                    <p className='mt-3 max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
                        {readResource.error.message || '请重试后再查看盘点任务。'}
                    </p>
                    <Button
                        type='button'
                        variant='outline'
                        className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
                        onClick={() => {
                            void retryRead()
                        }}
                    >
                        重试
                    </Button>
                </div>
            </div>
        )
    }

    if (readResource.status === 'loading') {
        return (
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <IndustrialHeader title={t('warehouse.stocktake.title')} description={t('warehouse.stocktake.subtitle')} icon={PackageSearch} />
                <div className='flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
                    <RefreshCw className='size-8 animate-spin text-primary/40' />
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>盘点基础数据加载中</p>
                </div>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader title={t('warehouse.stocktake.title')} description={t('warehouse.stocktake.subtitle')} icon={PackageSearch} />

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 bg-muted/10 px-3 md:px-4 py-2 rounded-full border border-dashed border-muted/50 w-full sm:w-auto overflow-hidden'>
                    <AlertCircle className='size-3 md:size-3.5 shrink-0' />
                    <span className='truncate'>{t('warehouse.stocktake.autoFreeze')}</span>
                </div>
                <div className='flex items-center gap-2 md:gap-3 justify-end'>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleRefresh}
                        className='size-9 md:size-10 rounded-full hover:bg-muted shrink-0'
                    >
                        <RefreshCw className={cn('size-3.5 md:size-4 text-muted-foreground', isLoading && 'animate-spin')} />
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={handleCreateDialogOpenChange}>
                        <DialogTrigger asChild>
                            <Button className='h-10 md:h-11 px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2 shrink-0'>
                                <Plus className='size-3.5 md:size-4' />
                                <span className='truncate'>{t('warehouse.stocktake.initiate')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                            <div className='absolute inset-0 bg-linear-to-br from-blue-600/5 via-transparent pointer-events-none' />
                            <form onSubmit={handleCreateTaskSubmit} className='relative p-5 md:p-8'>
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
                                        onClick={() => handleSelectTask(task)}
                                        className={cn(
                                            'group relative p-5 rounded-[24px] border border-muted/60 transition-all cursor-pointer',
                                            selectedTask?.id === task.id
                                                ? 'bg-background shadow-xl border-blue-500/50 scale-[1.02] ring-4 ring-blue-500/5'
                                                : 'bg-card/40 hover:bg-background/60 hover:shadow-lg hover:border-blue-500/30'
                                        )}
                                    >
                                        <div className='flex justify-between items-start mb-3'>
                                            <h4 className='font-black text-foreground tracking-tighter uppercase text-sm group-hover:text-blue-600 transition-colors italic'>
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
                                                <span className='text-[10px] font-black font-mono text-muted-foreground'>{task.warehouseCategoryCode}</span>
                                            </div>
                                            <div className='flex flex-col ml-auto text-right'>
                                                <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest'>{t('warehouse.stocktake.creator')}</span>
                                                <span className='text-[10px] font-black text-muted-foreground'>{creatorName}</span>
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
                                        <h3 className='text-sm font-black tracking-tighter italic uppercase text-foreground truncate'>{selectedTask.title}</h3>
                                    </div>
                                    <p className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ml-[16px] truncate'>
                                        {t('warehouse.stocktake.detailSubtitle', { count: items?.length || 0 })}
                                    </p>
                                </div>
                                {canSubmitAdjustment && (
                                    <Button
                                        onClick={handleRequestAdjustmentSubmission}
                                        disabled={isSubmittingAdjustment}
                                        className='h-9 md:h-10 px-4 md:px-6 rounded-full shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2 shrink-0 self-start sm:self-auto'
                                    >
                                        <Send className='size-3 md:size-3.5' /> {t('warehouse.stocktake.submitRecon')}
                                    </Button>
                                )}
                            </div>

                            <div className='p-0 overflow-x-auto scrollbar-hide'>
                                <ScrollArea className='h-auto max-h-[620px] lg:h-[620px]'>
                                    {itemsResource.status === 'error' ? (
                                        <div className='flex h-[420px] flex-col items-center justify-center px-6 text-center'>
                                            <AlertCircle className='size-8 text-rose-500' />
                                            <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>盘点明细加载失败</p>
                                            <p className='mt-3 max-w-lg text-[11px] font-bold leading-5 text-rose-700/80'>
                                                {itemsResource.error.message || '请重试后再查看盘点明细。'}
                                            </p>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
                                                onClick={() => {
                                                    void retryItems()
                                                }}
                                            >
                                                重试
                                            </Button>
                                        </div>
                                    ) : (
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
                                                ) : items.map((item: StocktakeItem) => (
                                                    <TableRow key={item.id} className='hover:bg-muted/30 transition-colors border-muted/50 group'>
                                                        <TableCell className='pl-5 md:pl-8 py-2 md:py-2.5'>
                                                            <div className='flex flex-col overflow-hidden max-w-[150px] md:max-w-none'>
                                                                <span className='font-bold text-[11px] md:text-[12px] text-foreground/90 tracking-tight uppercase group-hover:text-blue-600 transition-colors truncate'>{item.materialName}</span>
                                                                <span className='text-[7px] md:text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest truncate'>{item.materialCode}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='py-2 md:py-2.5'>
                                                            <span className='inline-flex h-3.5 items-center rounded-full bg-muted/30 px-1.5 md:px-2 font-black text-[7px] md:text-[8px] uppercase tracking-widest shadow-sm whitespace-nowrap'>
                                                                {item.batchNo || t('warehouse.stocktake.noBatch')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className='text-right py-2 md:py-2.5 font-mono text-[10px] md:text-[11px] font-bold text-muted-foreground/60 whitespace-nowrap'>
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
                                    )}
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
                onOpenChange={handleAdjustmentConfirmOpenChange}
                title={t('warehouse.adjustment.execute')}
                desc={t('warehouse.stocktake.toast.posting')} // Reuse or specific desc if needed
                confirmText={t('warehouse.stocktake.submitRecon')}
                handleConfirm={handleConfirmAdjustmentSubmission}
                isLoading={isSubmittingAdjustment}
            />
        </div>
    )
}

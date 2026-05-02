'use client'

import { AlertCircle, Database, History, Loader2, Package, Plus, RefreshCw, Search } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { Route } from '@/routes/_authenticated/warehouse/inbound'
import { ProductInboundFormDialog } from '../components/product-inbound-form-dialog'
import { useProductInboundViewModel } from '../hooks/use-product-inbound-view-model'
import { SalesExchangeReceivingQueueCard } from '../sales-exchange-receiving'
import { SalesReturnReceivingQueueCard } from '../sales-return-receiving'

export default function ProductInbound() {
    const { t } = useLanguage()
    const { mode } = Route.useSearch()
    const {
        readResource,
        searchResource,
        searchQuery,
        searchResults,
        isSearching,
        hasSearched,
        selectedItem,
        targetNodeDescription,
        isInboundOpen,
        formData,
        history,
        warehouseCategories,
        selectableWarehouseCategories,
        isSubmittingInbound,
        handleSearchQueryChange,
        handleOpenInboundForm,
        handleInboundDialogOpenChange,
        handleTargetCategoryChange,
        handleEntryDateChange,
        handleQuantityChange,
        handleBatchNoChange,
        handleRemarksChange,
        handleSubmitInbound,
        handleCloseInboundDialog,
        retryRead,
        retrySearch,
    } = useProductInboundViewModel()

    if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
        return <ForbiddenState />
    }

    if (readResource.status === 'error') {
        return (
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <IndustrialHeader title={t('warehouse.inbound.title')} description={t('warehouse.inbound.subtitle')} icon={Package} />
                <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-rose-700'>入库基础数据加载失败</p>
                    <p className='mt-3 max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
                        {readResource.error.message || '请重试后再进行产品入库。'}
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
                <IndustrialHeader title={t('warehouse.inbound.title')} description={t('warehouse.inbound.subtitle')} icon={Package} />
                <div className='flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
                    <Loader2 className='size-8 animate-spin text-primary/40' />
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        入库基础数据加载中
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader title={t('warehouse.inbound.title')} description={t('warehouse.inbound.subtitle')} icon={Package} />

            <SalesReturnReceivingQueueCard />
            <SalesExchangeReceivingQueueCard />

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                <div className='relative max-w-sm flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                    <Input
                        placeholder={t('warehouse.inbound.searchPlaceholder')}
                        className='pl-10 h-11 md:h-12 rounded-xl md:rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 text-xs md:text-sm font-medium transition-all'
                        autoFocus={mode === 'scan'}
                        value={searchQuery}
                        onChange={(e) => handleSearchQueryChange(e.target.value)}
                    />
                    {isSearching && (
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none'>
                            <RefreshCw className='size-3.5 text-emerald-500 animate-spin' />
                        </div>
                    )}
                </div>
                <div className='flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/5 px-3 md:px-4 py-2 rounded-full border border-dashed border-emerald-500/30 shrink-0'>
                    <AlertCircle className='size-3 md:size-3.5' />
                    {t('warehouse.inbound.archiveValidation')}
                </div>
            </div>

            <div className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
                <div className='bg-muted/30 px-4 md:px-6 py-3 md:py-4 border-b border-dashed border-muted/50 flex justify-between items-center text-left'>
                    <span className='text-[8px] md:text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest truncate'>{t('warehouse.inbound.results')}</span>
                    <span className='text-[9px] md:text-[10px] font-black text-muted-foreground/60 italic shrink-0'>
                        {t('warehouse.inbound.resultCount', { count: searchResults.length })}
                    </span>
                </div>
                <div className='h-[320px] overflow-y-auto divide-y divide-dashed divide-muted px-2'>
                    {searchResource.status === 'error' ? (
                        <div className='flex h-full flex-col items-center justify-center px-6 text-center'>
                            <AlertCircle className='size-8 text-rose-500' />
                            <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>搜索结果加载失败</p>
                            <p className='mt-2 max-w-md text-[10px] font-bold leading-5 text-rose-700/80'>
                                {searchResource.error.message || '请重试后再搜索主数据。'}
                            </p>
                            <Button
                                type='button'
                                variant='outline'
                                className='mt-5 h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                                onClick={() => {
                                    void retrySearch()
                                }}
                            >
                                重试
                            </Button>
                        </div>
                    ) : searchResource.status === 'loading' ? (
                        <div className='flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground/40'>
                            <Loader2 className='size-6 animate-spin text-emerald-500/60' />
                            <p className='mt-4 text-[10px] font-black uppercase tracking-widest'>搜索中</p>
                        </div>
                    ) : searchResource.status === 'ready' && searchResults.length > 0 ? (
                        searchResults.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 md:p-4 transition-all group rounded-xl md:rounded-[20px] my-1 gap-4',
                                    'hover:bg-emerald-500/5 cursor-pointer',
                                )}
                                onClick={() => handleOpenInboundForm(item)}
                            >
                                <div className='flex items-center gap-3 md:gap-5 overflow-hidden'>
                                    <div className='size-10 md:size-12 rounded-xl md:rounded-2xl bg-background border border-muted/50 flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-500/30 group-hover:scale-105 transition-all'>
                                        <Package className='size-5 md:size-6 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors' />
                                    </div>
                                    <div className='overflow-hidden space-y-0.5 md:space-y-1'>
                                        <div className='flex items-center gap-2 md:gap-3'>
                                            <h4 className='font-black text-sm md:text-[15px] text-slate-800 tracking-tighter uppercase transition-colors group-hover:text-emerald-700 italic truncate max-w-[150px] md:max-w-xs'>{item.name}</h4>
                                            <Badge className={cn(
                                                'h-3.5 md:h-4 text-[7px] md:text-[8px] font-black px-1.5 md:px-2 uppercase tracking-widest border-none rounded-full shrink-0',
                                                item.sourceModule === 'PRODUCT' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                                            )}>
                                                {item.sourceModule === 'PRODUCT' ? t('warehouse.inbound.product') : t('warehouse.inbound.material')}
                                            </Badge>
                                        </div>
                                        <div className='flex items-center gap-3 md:gap-4 truncate'>
                                            <span className='text-[9px] md:text-[10px] font-black font-mono text-muted-foreground/30 uppercase tracking-widest shrink-0'>SKU: {item.code}</span>
                                            {item.spec && <span className='text-[9px] md:text-[10px] font-bold text-muted-foreground/40 truncate italic opacity-60'>SPEC: {item.spec}</span>}
                                        </div>
                                    </div>
                                </div>
                                <NonBlockingPermissionBoundary permission='action_warehouse_inbound_record'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='h-9 md:h-10 rounded-full px-4 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 transition-all shadow-lg shadow-emerald-500/10 shrink-0 hover:bg-emerald-500/15'
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            handleOpenInboundForm(item)
                                        }}
                                    >
                                        {t('warehouse.inbound.startInbound')} <Plus className='size-3' />
                                    </Button>
                                </NonBlockingPermissionBoundary>
                            </div>
                        ))
                    ) : (
                        <div className='h-full flex flex-col items-center justify-center px-6 text-center text-muted-foreground/20 italic'>
                            <div className='relative mb-4'>
                                <Search className='size-16 opacity-5' />
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <Database className='size-8 opacity-10 animate-pulse' />
                                </div>
                            </div>
                            <p className='text-[10px] font-black uppercase tracking-widest'>{t('warehouse.inbound.idleTitle')}</p>
                            <p className='mt-3 max-w-md text-[10px] md:text-[11px] font-bold not-italic text-muted-foreground/45 leading-5'>
                                {hasSearched
                                    ? t('warehouse.inbound.emptyAfterSearchGuide')
                                    : t('warehouse.inbound.emptyBeforeSearchGuide')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner mt-4'>
                <div className='px-5 md:px-8 py-4 md:py-5 border-b border-dashed border-muted/50 flex items-center justify-between bg-muted/20'>
                    <div className='flex items-center gap-2'>
                        <History className='size-4 text-emerald-600 shrink-0' />
                        <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase truncate'>{t('warehouse.inbound.historyTitle')}</h3>
                    </div>
                    <p className='hidden sm:block text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.inbound.latestTransactions')}</p>
                </div>
                <div className='overflow-x-auto scrollbar-hide'>
                    <Table className='min-w-[700px] md:min-w-0'>
                        <TableHeader className='bg-muted/30 h-12 md:h-14'>
                            <TableRow className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                <TableHead className='pl-5 md:pl-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.transId')}</TableHead>
                                <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.targetNode')}</TableHead>
                                <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.quantity')}</TableHead>
                                <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.batch')}</TableHead>
                                <TableHead className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.area')}</TableHead>
                                <TableHead className='pr-5 md:pr-8 text-right text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.inbound.columns.timestamp')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? (
                                history.slice(0, 10).map((record) => (
                                    <TableRow key={record.id} className='hover:bg-muted/30 transition-colors border-muted/50 group'>
                                        <TableCell className='font-mono text-[8px] text-muted-foreground/20 pl-5 md:pl-8'>#{record.id}</TableCell>
                                        <TableCell className='py-2.5'>
                                            <div className='flex flex-col overflow-hidden max-w-[150px]'>
                                                <span className='font-bold text-[12px] text-slate-700 tracking-tight uppercase group-hover:text-emerald-600 transition-colors truncate'>
                                                    {record.materialId}
                                                </span>
                                                <span className='text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest truncate'>ID: {record.materialId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='py-2.5'>
                                            <div className='flex items-center gap-1.5'>
                                                <div className='w-1 h-3 bg-emerald-500/40 rounded-full shrink-0' />
                                                <span className='font-black text-emerald-600 text-sm font-mono'>+{record.quantity}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='text-[9px] md:text-[10px] font-bold font-mono text-muted-foreground/40 uppercase tracking-tighter truncate max-w-[80px]'>{record.batchNo}</TableCell>
                                        <TableCell className='py-2.5'>
                                            <Badge variant='outline' className='font-black text-[7px] md:text-[8px] uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-none h-4 px-2 rounded-full whitespace-nowrap'>
                                                {warehouseCategories.find(c => c.value === record.targetCategory)?.label || record.targetCategory}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className='text-right text-[8px] md:text-[9px] font-mono font-bold text-muted-foreground/30 pr-5 md:pr-8'>{record.entryDate}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className='h-32 text-center'>
                                        <p className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/20'>{t('warehouse.inbound.noHistory')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ProductInboundFormDialog
                open={isInboundOpen}
                onOpenChange={handleInboundDialogOpenChange}
                formData={formData}
                selectableWarehouseCategories={selectableWarehouseCategories}
                targetNodeDescription={targetNodeDescription}
                itemUnit={selectedItem?.uom}
                isSubmittingInbound={isSubmittingInbound}
                onTargetCategoryChange={handleTargetCategoryChange}
                onEntryDateChange={handleEntryDateChange}
                onQuantityChange={handleQuantityChange}
                onBatchNoChange={handleBatchNoChange}
                onRemarksChange={handleRemarksChange}
                onSubmit={() => { void handleSubmitInbound() }}
                onCancel={handleCloseInboundDialog}
            />
        </div>
    )
}

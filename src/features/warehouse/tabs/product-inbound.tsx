'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Database, History, Package, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { isForbiddenError } from '@/lib/error-status'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { auditUtils } from '@/lib/audit-utils'
import { Route } from '@/routes/_authenticated/warehouse/inbound'
import { WarehouseCategoryCoreService, type WarehouseCategoryOption } from '../category'
import { InventoryCoreService, InventoryTransactionService, type InboundRecord, type MasterDataSearchResult } from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import {
    filterWarehouseCategoriesByScene,
    getDefaultWarehouseCategoryCode,
} from '../utils/warehouse-category-config'

const DEFAULT_INBOUND_DATA = {
    quantity: 1,
    batchNo: '',
    targetCategory: '',
    entryDate: new Date().toISOString().slice(0, 10),
    remarks: ''
}

export default function ProductInbound() {
    const { t } = useLanguage()
    const { mode } = Route.useSearch()
    const queryClient = useQueryClient()
    const { allowsAction } = useNonBlockingPermissionActions()
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [selectedItem, setSelectedItem] = useState<MasterDataSearchResult | null>(null)
    const [isInboundOpen, setIsInboundOpen] = useState(false)
    const [formData, setFormData] = useState(DEFAULT_INBOUND_DATA)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim())
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    const historyQuery = useQuery({
        queryKey: warehouseQueryKeys.inboundHistory(),
        queryFn: () => InventoryCoreService.getInboundHistory(),
    })

    const categoriesQuery = useQuery({
        queryKey: warehouseQueryKeys.categoryOptions(),
        queryFn: () => WarehouseCategoryCoreService.getCategoryOptions(),
    })

    const searchQueryResult = useQuery({
        queryKey: warehouseQueryKeys.masterDataSearch(debouncedSearchQuery),
        queryFn: () => InventoryCoreService.searchMasterData(debouncedSearchQuery),
        enabled: debouncedSearchQuery.length > 0,
    })

    useEffect(() => {
        if (!historyQuery.error && !categoriesQuery.error) return
        toast.error(t('warehouse.inbound.toast.failed'))
    }, [categoriesQuery.error, historyQuery.error, t])

    useEffect(() => {
        if (!debouncedSearchQuery || !searchQueryResult.isSuccess) return
        if ((searchQueryResult.data ?? []).length > 0) return
        toast.error(t('warehouse.inbound.toast.notFound'))
    }, [debouncedSearchQuery, searchQueryResult.data, searchQueryResult.isSuccess, t])

    const submitInboundMutation = useMutation({
        mutationFn: async (payload: Omit<InboundRecord, 'id'>) => {
            return InventoryTransactionService.recordInbound(payload)
        },
        onSuccess: async (_, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inboundHistory() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryList() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryValuation() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAlertSummary() }),
            ])

            toast.success(t('warehouse.inbound.toast.success', { name: variables.materialName }))
            setIsInboundOpen(false)
            setSelectedItem(null)
            setSearchQuery('')
            setDebouncedSearchQuery('')
            setFormData(DEFAULT_INBOUND_DATA)
        },
        onError: (error) => {
            failLoudly(error, 'ProductInbound.submitInbound')
        },
    })

    const error = historyQuery.error ?? categoriesQuery.error
    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const history = historyQuery.data ?? []
    const warehouseCategories = categoriesQuery.data ?? ([] as WarehouseCategoryOption[])
    const searchResults = debouncedSearchQuery ? (searchQueryResult.data ?? []) : []
    const isSearching = searchQueryResult.isFetching

    const openInboundForm = (item: MasterDataSearchResult) => {
        if (!allowsAction('action_warehouse_inbound_record')) return
        setSelectedItem(item)

        const scene = item.sourceModule === 'PRODUCT' ? 'product-inbound' : 'material-inbound'
        setFormData({
            targetCategory: getDefaultWarehouseCategoryCode(warehouseCategories, scene, item.category),
            batchNo: `P${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
            quantity: 1,
            entryDate: new Date().toISOString().slice(0, 10),
            remarks: '',
        })

        setIsInboundOpen(true)
    }

    const submitInbound = async () => {
        if (!allowsAction('action_warehouse_inbound_record')) return
        if (!selectedItem) return
        if (formData.quantity <= 0) {
            toast.error(t('warehouse.inbound.toast.quantityInvalid'))
            return
        }

        await submitInboundMutation.mutateAsync({
            materialId: selectedItem.id,
            materialName: selectedItem.name,
            materialCode: selectedItem.code,
            quantity: formData.quantity,
            purchasePrice: 0,
            batchNo: formData.batchNo,
            entryDate: formData.entryDate,
            operator: auditUtils.getOperatorInfo().label,
            remarks: formData.remarks,
            targetCategory: formData.targetCategory
        })
    }

    const selectableWarehouseCategories = selectedItem
        ? filterWarehouseCategoriesByScene(
            warehouseCategories,
            selectedItem.sourceModule === 'PRODUCT' ? 'product-inbound' : 'material-inbound'
        )
        : warehouseCategories

    const hasSearched = searchQuery.trim().length > 0

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <PageHeader title={t('warehouse.inbound.title')} description={t('warehouse.inbound.subtitle')} icon={Package} />

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                <div className='relative max-w-sm flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                    <Input
                        placeholder={t('warehouse.inbound.searchPlaceholder')}
                        className='pl-10 h-11 md:h-12 rounded-xl md:rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 text-xs md:text-sm font-medium transition-all'
                        autoFocus={mode === 'scan'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                    {searchResults.length > 0 ? (
                        searchResults.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 md:p-4 transition-all group rounded-xl md:rounded-[20px] my-1 gap-4',
                                    'hover:bg-emerald-500/5 cursor-pointer',
                                )}
                                onClick={() => openInboundForm(item)}
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
                                            openInboundForm(item)
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

            <Dialog open={isInboundOpen} onOpenChange={setIsInboundOpen}>
                <DialogContent className='w-[95vw] sm:max-w-[560px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                    <div className='absolute inset-0 bg-linear-to-br from-emerald-600/5 via-transparent pointer-events-none' />

                    <div className='relative p-5 md:p-8'>
                        <DialogHeader className='mb-6 md:mb-8 text-left'>
                            <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase flex items-center gap-3 md:gap-4'>
                                <div className='size-9 md:size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0'>
                                    <Package className='size-4 md:size-5 text-emerald-600' />
                                </div>
                                <span className='truncate'>{t('warehouse.inbound.dialog.title')}</span>
                            </DialogTitle>
                            <DialogDescription className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1 truncate block'>
                                {selectedItem ? t('warehouse.inbound.dialog.targetNode', { name: selectedItem.name, code: selectedItem.code }) : ''}
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4 md:space-y-6'>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.inbound.dialog.destination')}
                                    </Label>
                                    <Select
                                        value={formData.targetCategory}
                                        onValueChange={(val) => {
                                            setFormData((current) => ({ ...current, targetCategory: val }))
                                        }}
                                    >
                                        <SelectTrigger className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus:ring-emerald-500 shadow-inner text-xs'>
                                            <SelectValue placeholder={t('warehouse.inbound.dialog.selectArea')} />
                                        </SelectTrigger>
                                        <SelectContent className='rounded-xl shadow-2xl border-none p-1.5 md:p-2'>
                                            {selectableWarehouseCategories.map(cat => (
                                                <SelectItem key={cat.value} value={cat.value} className='rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest py-2 md:py-2.5'>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.inbound.dialog.entryDate')}
                                    </Label>
                                    <Input
                                        type='date'
                                        value={formData.entryDate}
                                        onChange={(e) => {
                                            setFormData((current) => ({ ...current, entryDate: e.target.value }))
                                        }}
                                        className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-bold px-4 md:px-5 focus-visible:ring-emerald-500 shadow-inner text-xs'
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.inbound.dialog.quantity')}
                                    </Label>
                                    <div className='relative group'>
                                        <Input
                                            type='number'
                                            className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono text-lg md:text-xl font-black pl-4 md:pl-5 pr-10 md:pr-12 focus-visible:ring-emerald-500 shadow-inner group-hover:bg-muted/70 transition-all'
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                setFormData((current) => ({ ...current, quantity: Number(e.target.value) }))
                                            }}
                                        />
                                        <div className='absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 select-none group-focus-within:text-emerald-500 transition-colors'>
                                            {selectedItem?.uom || t('warehouse.inbound.dialog.units')}
                                        </div>
                                    </div>
                                </div>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.inbound.dialog.batch')}
                                    </Label>
                                    <Input
                                        placeholder={t('warehouse.inbound.dialog.batchPlaceholder')}
                                        value={formData.batchNo}
                                        onChange={(e) => {
                                            setFormData((current) => ({ ...current, batchNo: e.target.value }))
                                        }}
                                        className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-black text-xs md:text-sm px-4 md:px-5 focus-visible:ring-emerald-500 shadow-inner'
                                    />
                                </div>
                            </div>

                            <div className='space-y-3'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                    {t('warehouse.inbound.dialog.remarks')}
                                </Label>
                                <Input
                                    placeholder={t('warehouse.inbound.dialog.remarksPlaceholder')}
                                    value={formData.remarks}
                                    onChange={(e) => {
                                        setFormData((current) => ({ ...current, remarks: e.target.value }))
                                    }}
                                    className='h-11 rounded-xl bg-muted/50 border-none font-bold px-5 focus-visible:ring-emerald-500 shadow-inner'
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className='p-8 pt-0 bg-transparent flex items-center justify-between gap-4'>
                        <Button
                            variant='ghost'
                            className='flex-1 h-11 rounded-full hover:bg-muted font-black text-[10px] uppercase tracking-widest transition-colors'
                            onClick={() => {
                                setIsInboundOpen(false)
                                setFormData(DEFAULT_INBOUND_DATA)
                            }}
                        >
                            {t('warehouse.inbound.dialog.cancel')}
                        </Button>
                        <NonBlockingPermissionBoundary permission='action_warehouse_inbound_record'>
                            <Button
                                className='flex-1 h-11 rounded-full shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2'
                                onClick={() => { void submitInbound() }}
                                disabled={submitInboundMutation.isPending}
                            >
                                <CheckCircle2 className='size-4' /> {t('warehouse.inbound.dialog.commit')}
                            </Button>
                        </NonBlockingPermissionBoundary>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

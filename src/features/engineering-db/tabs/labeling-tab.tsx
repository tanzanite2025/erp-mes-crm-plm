'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type ColumnDef,
    useReactTable,
} from '@tanstack/react-table'
import { useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, Sticker, FileCode, FileText, Eye, Hash, Calendar, Zap, Droplets, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { type LabelingDraft } from '../data/schema'
import { ProductionDBService } from '../services/production-db-service'
import { FileResolverService } from '../services/file-resolver-service'
import { LabelingActionDialog } from '../components/labeling-action-dialog'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { toast } from 'sonner'
import { CADViewerDialog } from '../components/cad-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ENGINEERING_DB_LABELING_QUERY_KEY } from '../query-keys'

export function LabelingTab() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-db/labeling' })
    const { data: products = [] } = useGetProducts()
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<LabelingDraft | undefined>(undefined)

    const productMap = useMemo(() => {
        const map = new Map<string, (typeof products)[0]>()
        products.forEach((product) => map.set(product.id, product))
        return map
    }, [products])

    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; sku?: string } | null>(null)
    const [cadPreviewOpen, setCadPreviewOpen] = useState(false)
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
    const [excelPreviewOpen, setExcelPreviewOpen] = useState(false)

    const { data = [], isLoading } = useQuery({
        queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
        queryFn: () => ProductionDBService.getLabeling(),
    })

    const saveMutation = useMutation({
        mutationFn: async (params: {
            data: LabelingDraft
            isPatch: boolean
            delta?: any
            version?: number
        }) => {
            const { data: formData, isPatch, delta, version } = params
            if (isPatch && delta) {
                await ProductionDBService.patchLabeling(formData.id, delta, version!)
                return
            }
            await ProductionDBService.saveLabelingItem(formData)
        },
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_LABELING_QUERY_KEY })
            setOpen(false)
            setCurrentRow(undefined)
            toast.success(
                variables.isPatch
                    ? t('engineering.labeling.toasts.updateSuccess')
                    : t('engineering.labeling.toasts.saveSuccess')
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => ProductionDBService.deleteLabeling(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_LABELING_QUERY_KEY })
            toast.success(t('engineering.labeling.toasts.deleteSuccess'))
        },
    })

    useEffect(() => {
        return () => {
            if (previewFile?.url.startsWith('blob:')) {
                URL.revokeObjectURL(previewFile.url)
            }
        }
    }, [previewFile?.url])

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const product = productMap.get(item.productId || '')
            const searchStr = searchTerm.toLowerCase()
            return item.name.toLowerCase().includes(searchStr) ||
                   (product?.sku || '').toLowerCase().includes(searchStr) ||
                   item.type.toLowerCase().includes(searchStr)
        })
    }, [data, productMap, searchTerm])

    const getIconInfo = (ext?: string, type?: string) => {
        const lowerExt = ext?.toLowerCase()
        const isCAD = ['dwg', 'dxf', 'stp', 'step'].includes(lowerExt || '')
        const mainIcon = isCAD ? FileCode : FileText

        let TypeIcon = PenTool
        let typeColor = 'text-teal-500 bg-teal-500/10 border-teal-500/20'

        if (type === 'Water') {
            TypeIcon = Droplets
            typeColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20'
        } else if (type === 'Laser') {
            TypeIcon = Zap
            typeColor = 'text-orange-500 bg-orange-500/10 border-orange-500/20'
        } else if (type === 'Paint') {
            TypeIcon = PenTool
            typeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        }

        return { mainIcon, TypeIcon, typeColor, isCAD }
    }

    const handlePreview = async (item: LabelingDraft) => {
        if (!item.fileUrl) {
            toast.error(t('engineering.labeling.toasts.noFile'))
            return
        }

        const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
        if (!resolvedUrl) {
            toast.error(t('engineering.labeling.toasts.unResolved'))
            return
        }

        const product = productMap.get(item.productId || '')
        const ext = item.fileExtension?.toLowerCase()

        setPreviewFile({
            url: resolvedUrl,
            name: item.name,
            sku: product?.sku,
        })

        if (['dwg', 'dxf', 'stp', 'step', 'rvt'].includes(ext || '')) {
            setCadPreviewOpen(true)
        } else if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
            setExcelPreviewOpen(true)
        } else {
            setPdfPreviewOpen(true)
        }
    }

    const columns: ColumnDef<LabelingDraft>[] = [
        {
            accessorKey: 'name',
            header: t('engineering.labeling.table.name'),
            cell: ({ row }) => {
                const info = getIconInfo(row.original.fileExtension, row.original.type)
                const Icon = info.mainIcon
                return (
                    <div className='flex items-center gap-3'>
                        <div className={`size-10 rounded-lg border ${info.typeColor} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                            <Icon className='size-5' />
                        </div>
                        <div className='flex flex-col'>
                            <span className='font-bold text-sm text-foreground'>{row.original.name}</span>
                            <div className='flex items-center gap-2 mt-1'>
                                <Badge variant='outline' className='text-[10px] h-4 px-1.5 py-0 bg-muted/50 text-muted-foreground uppercase font-mono font-bold border-none'>
                                    {row.original.fileExtension || 'PDF'}
                                </Badge>
                                <span className='text-[10px] text-muted-foreground/60 font-medium uppercase'>
                                    {row.original.type === 'Water' ? t('engineering.labeling.types.water') :
                                     row.original.type === 'Paint' ? t('engineering.labeling.types.paint') :
                                     row.original.type === 'Laser' ? t('engineering.labeling.types.laser') : t('engineering.labeling.types.other')}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            header: t('engineering.labeling.table.product'),
            cell: ({ row }) => {
                if (!row.original.productId) {
                    return <span className='text-[10px] font-black uppercase text-muted-foreground/40 italic bg-muted/30 px-2 py-0.5 rounded-full'>{t('engineering.labeling.table.generic')}</span>
                }
                const product = productMap.get(row.original.productId || '')
                return (
                    <div className='flex flex-col'>
                        <span className='text-[12px] font-bold text-teal-600 font-mono'>
                            {product?.sku || 'UNKNOWN'}
                        </span>
                        <span className='text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]'>
                            {product?.name || t('engineering.labeling.table.unlinked')}
                        </span>
                    </div>
                )
            }
        },
        {
            accessorKey: 'createdAt',
            header: t('engineering.labeling.table.date'),
            cell: ({ row }) => (
                <span className='font-mono text-[11px] text-muted-foreground font-medium'>
                    {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
                </span>
            )
        },
        {
            id: 'actions',
            header: t('engineering.labeling.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-teal-500/10 hover:text-teal-500' onClick={() => handlePreview(row.original)}><Eye className='size-3.5' /></Button>
                    <div className='w-px h-4 bg-border mx-1' />
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original); setOpen(true); }}><Edit className='size-3.5' /></Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full text-destructive hover:bg-destructive/10'
                        onClick={() => runConfirmedAction({
                            confirmKey: 'engineering.labeling.toasts.deleteConfirm',
                            onAction: async () => {
                                await deleteMutation.mutateAsync(row.original.id)
                            }
                        })}
                    >
                        <Trash2 className='size-3.5' />
                    </Button>
                </div>
            )
        }
    ]

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const handleSave = async (params: {
        data: LabelingDraft
        isPatch: boolean
        delta?: any
        version?: number
    }) => {
        await saveMutation.mutateAsync(params)
    }

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            <div className='flex flex-col gap-2 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent pointer-events-none' />
                <div className='flex items-center gap-2 text-teal-600'>
                    <Sticker className='size-4 md:size-5 text-teal-600' />
                    <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase'>{t('engineering.labeling.overview.title')}</h3>
                </div>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                    <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 max-w-2xl'>
                        {t('engineering.labeling.overview.description')}
                    </p>
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-teal-500/5 border border-teal-500/10 w-fit'>
                        <span className='text-[10px] font-black text-teal-600/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                        <div className='size-1.5 rounded-full bg-teal-600 animate-pulse' />
                    </div>
                </div>
            </div>

            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
                <div className='relative w-full sm:w-96 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-teal-600 transition-colors' />
                    <Input
                        placeholder={t('engineering.labeling.placeholders.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className='pl-10 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-teal-500/20 w-full'
                    />
                </div>
                <Button
                    onClick={() => { setCurrentRow(undefined); setOpen(true); }}
                    className='w-full sm:w-auto bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all active:scale-95'
                >
                    <Plus className='size-4' /> {t('engineering.labeling.table.upload')}
                </Button>
            </div>

            <Card className='hidden md:block border border-dashed border-muted/50 shadow-none bg-background overflow-hidden rounded-[24px]'>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader className='bg-muted/30 h-14'>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className='text-[10px] font-black uppercase tracking-widest px-6 text-muted-foreground/50'>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center'>{t('common.status.syncing')}</TableCell></TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        onClick={() => handlePreview(row.original)}
                                        className={cn(
                                            'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16 cursor-pointer',
                                            row.original.id === highlightId && 'bg-primary/5 animate-pulse border-2 border-primary/20 shadow-inner'
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='px-6'>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30'>{t('engineering.labeling.table.empty')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className='md:hidden flex flex-col gap-4'>
                {isLoading ? (
                    <div className='p-12 text-center text-[10px] font-black italic uppercase text-muted-foreground animate-pulse'>{t('engineering.labeling.placeholders.mobileLoading')}</div>
                ) : filteredData.length === 0 ? (
                    <div className='p-12 text-center bg-muted/5 rounded-[28px] border border-dashed border-muted-foreground/50 italic text-[10px] text-muted-foreground opacity-40 uppercase'>{t('engineering.labeling.placeholders.noData')}</div>
                ) : (
                    filteredData.map((item) => {
                        const product = productMap.get(item.productId || '')
                        const info = getIconInfo(item.fileExtension, item.type)
                        const Icon = info.mainIcon
                        const TypeIcon = info.TypeIcon
                        return (
                            <div
                                key={item.id}
                                onClick={() => handlePreview(item)}
                                className={cn(
                                    'p-5 rounded-[28px] border border-dashed border-muted/50 bg-background/50 active:scale-[0.98] transition-all relative overflow-hidden group',
                                    item.id === highlightId && 'bg-teal-500/5 ring-2 ring-teal-500/20 animate-pulse'
                                )}
                            >
                                <div className='absolute top-0 right-0 p-4 opacity-10'>
                                    <Icon className={cn('size-16', info.typeColor.split(' ')[0])} />
                                </div>

                                <div className='flex flex-col gap-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className={cn('size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm', info.typeColor)}>
                                            <Icon className='size-5' />
                                        </div>
                                        <Badge variant='outline' className={cn(
                                            'text-[10px] font-black italic font-mono border-none px-3 rounded-full h-5 leading-none',
                                            product ? 'bg-teal-500/10 text-teal-600' : 'bg-muted/50 text-muted-foreground/60'
                                        )}>
                                            {product?.sku || t('engineering.labeling.table.generic')}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h4 className='text-sm font-black tracking-tight leading-tight group-active:text-teal-600 transition-colors line-clamp-2'>{item.name}</h4>
                                        <div className='flex flex-wrap items-center gap-2 mt-3 font-black uppercase tracking-widest'>
                                            <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px]', info.typeColor)}>
                                                <TypeIcon className='size-3 opacity-40' />
                                                {item.type === 'Water' ? t('engineering.labeling.types.water') :
                                                 item.type === 'Paint' ? t('engineering.labeling.types.paint') :
                                                 item.type === 'Laser' ? t('engineering.labeling.types.laser') : t('engineering.labeling.types.other')}
                                            </div>
                                            <div className='size-1 rounded-full bg-muted-foreground/20' />
                                            <div className='flex items-center gap-1 text-[9px] text-muted-foreground/60 italic font-mono'>
                                                <Hash className='size-2.5 opacity-30' />
                                                {item.id.substring(0, 6)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='flex items-center justify-between pt-3 border-t border-dashed border-muted-foreground/10'>
                                        <div className='flex items-center gap-2 text-[9px] text-muted-foreground/40 font-medium italic'>
                                            <Calendar className='size-3 opacity-30' />
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500' onClick={(e) => { e.stopPropagation(); handlePreview(item); }}><Eye className='size-4' /></Button>
                                            <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={(e) => { e.stopPropagation(); setCurrentRow(item); setOpen(true); }}><Edit className='size-3.5' /></Button>
                                            <Button
                                                variant='ghost'
                                                size='icon'
                                                className='size-8 rounded-full text-destructive/40'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    runConfirmedAction({
                                                        confirmKey: 'engineering.labeling.toasts.deleteConfirm',
                                                        onAction: async () => {
                                                            await deleteMutation.mutateAsync(item.id)
                                                        }
                                                    })
                                                }}
                                            >
                                                <Trash2 className='size-3.5' />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className='pt-2'>
                <DataTablePagination table={table} />
            </div>

            <LabelingActionDialog
                open={open}
                onOpenChange={setOpen}
                currentRow={currentRow}
                onSave={handleSave}
                isLoading={saveMutation.isPending}
            />
            <CADViewerDialog open={cadPreviewOpen} onOpenChange={setCadPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <PDFViewerDialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <ExcelViewerDialog open={excelPreviewOpen} onOpenChange={setExcelPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
        </div>
    )
}

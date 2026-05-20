'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    flexRender,
    type ColumnDef,
} from '@tanstack/react-table'
import { useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, BookOpen, Download, Eye, Hash, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type TechnicalSpec } from '../data/schema'
import { SpecsService } from '../services/specs-service'
import { FileResolverService } from '../services/file-resolver-service'
import { SpecActionDialog } from '../components/spec-action-dialog'
import { toast } from 'sonner'
import { CADViewerDialog } from '../components/cad-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'
import { getEngineeringDbFileVisual, getEngineeringDbPreviewKind } from '../view-helpers'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'

type SpecsRowViewModel = {
    item: TechnicalSpec
    searchText: string
}

export function SpecsTab() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-db/specs' })
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<TechnicalSpec | undefined>(undefined)

    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; sku?: string } | null>(null)
    const [cadPreviewOpen, setCadPreviewOpen] = useState(false)
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
    const [excelPreviewOpen, setExcelPreviewOpen] = useState(false)

    useEffect(() => {
        return () => {
            if (previewFile?.url.startsWith('blob:')) {
                URL.revokeObjectURL(previewFile.url)
            }
        }
    }, [previewFile?.url])

    const { data = [], isLoading } = useQuery({
        queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
        queryFn: () => SpecsService.getSpecs(),
    })

    const saveMutation = useMutation({
        mutationFn: async (params: {
            data: TechnicalSpec
            isPatch: boolean
            delta?: DeltaSet
            version?: number
        }) => {
            const { data: formData, isPatch, delta, version } = params

            if (isPatch && delta) {
                await SpecsService.patchSpec(formData.id, delta, version!)
                return
            }

            await SpecsService.saveSpec(formData)
        },
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPECS_QUERY_KEY })
            setOpen(false)
            setCurrentRow(undefined)
            toast.success(
                variables.isPatch
                    ? t('engineering.specs.toasts.updateSuccess')
                    : t('engineering.specs.toasts.saveSuccess')
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => SpecsService.deleteSpec(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPECS_QUERY_KEY })
            toast.success(t('engineering.specs.toasts.deleteSuccess'))
        },
    })

    const filteredData = useMemo(() => {
        const rows = data.map<SpecsRowViewModel>((item) => ({
            item,
            searchText: [
                item.name,
                item.category,
                item.description || '',
                item.fileExtension || '',
            ].join(' ').toLowerCase(),
        }))

        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return rows
        }

        return rows.filter((row) => row.searchText.includes(normalizedSearch))
    }, [data, searchTerm])

    const handleDownload = async (item: TechnicalSpec) => {
        if (item.fileUrl) {
            const url = await FileResolverService.resolveFileUrl(item.fileUrl)
            if (url) window.open(url, '_blank')
        } else {
            toast.error(t('engineering.specs.toasts.noAttachment'))
        }
    }

    const handlePreview = async (item: TechnicalSpec) => {
        if (item.fileUrl) {
            const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
            if (!resolvedUrl) {
                toast.error(t('engineering.specs.toasts.unResolved'))
                return
            }
            setPreviewFile({ url: resolvedUrl, name: item.name })
            if (getEngineeringDbPreviewKind(item.fileExtension) === 'excel') {
                setExcelPreviewOpen(true)
            } else {
                setPdfPreviewOpen(true)
            }
        } else {
            toast.error(t('engineering.specs.toasts.noFile'))
        }
    }

    const columns: ColumnDef<SpecsRowViewModel>[] = [
        {
            accessorKey: 'item.name',
            header: t('engineering.specs.table.name'),
            cell: ({ row }) => {
                const fileVisual = getEngineeringDbFileVisual({ extension: row.original.item.fileExtension, category: 'SPEC' })
                const Icon = fileVisual.icon
                return (
                    <div className='flex items-center gap-2.5'>
                        <div className={`size-8 rounded-lg border ${fileVisual.containerClassName} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                            <Icon className={`size-4 ${fileVisual.iconClassName}`} />
                        </div>
                        <div className='flex flex-col'>
                            <span className='font-bold text-sm text-foreground'>{row.original.item.name}</span>
                            <div className='flex items-center gap-2 mt-0.5'>
                                <Badge variant='outline' className='text-[10px] h-4 px-1.5 py-0 bg-muted/50 text-muted-foreground uppercase font-mono font-bold border-none'>
                                    {row.original.item.fileExtension || 'PDF'}
                                </Badge>
                                <span className='text-[10px] text-muted-foreground font-medium uppercase tracking-tight'>
                                    {t('engineering.specs.table.version')}: {row.original.item.version} | 
                                    {row.original.item.createdAt ? new Date(row.original.item.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: 'item.category',
            header: t('engineering.specs.table.category'),
            cell: ({ row }) => (
                <Badge variant='outline' className='w-fit h-5 text-[10px] px-2 rounded-full font-bold bg-amber-500/10 text-amber-500 border-amber-500/20 whitespace-nowrap'>
                    {row.original.item.category}
                </Badge>
            )
        },
        {
            accessorKey: 'item.description',
            header: t('engineering.specs.table.description'),
            cell: ({ row }) => (
                <p className='text-[12px] text-muted-foreground max-w-[200px] truncate italic font-medium'>
                    {row.original.item.description || t('engineering.specs.table.noDesc')}
                </p>
            )
        },
        {
            id: 'actions',
            header: t('engineering.specs.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500' onClick={() => handleDownload(row.original.item)}><Download className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500' onClick={() => handlePreview(row.original.item)}><Eye className='size-3.5' /></Button>
                    <div className='w-px h-4 bg-border mx-1' />
                    <div onClick={(event) => event.stopPropagation()}>
                        <AuditTimelineTriggerButton
                            module={AUDIT_MODULES.engineeringSpec}
                            targetId={row.original.item.id}
                            targetName={row.original.item.name}
                            label={t('common.audit.trigger')}
                            iconOnly
                            className='size-8 rounded-full border-transparent px-0 hover:bg-violet-500/10 hover:text-violet-500'
                        />
                    </div>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original.item); setOpen(true); }}><Edit className='size-3.5' /></Button>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full text-destructive hover:bg-destructive/10' 
                        onClick={() => runConfirmedAction({
                            confirmKey: 'engineering.specs.toasts.deleteConfirm',
                            onAction: async () => {
                                if (!row.original.item.id) {
                                    toast.error(t('engineering.specs.toasts.noId'))
                                    return
                                }
                                try {
                                    await deleteMutation.mutateAsync(row.original.item.id)
                                } catch (error) {
                                    const message = error instanceof Error ? error.message : t('engineering.specs.toasts.deleteFailed')
                                    toast.error(message)
                                }
                            }
                        })}
                    >
                        <Trash2 className='size-3.5' />
                    </Button>
                </div>
            )
        }
    ]

    const table = useUdsClientTable({
        data: filteredData,
        columns,
    })

    const handleSave = async (params: {
        data: TechnicalSpec
        isPatch: boolean
        delta?: DeltaSet
        version?: number
    }) => {
        const { data: formData, isPatch, delta, version } = params

        await saveMutation.mutateAsync({ data: formData, isPatch, delta, version })
    }

    return (
        <div className='flex flex-col gap-5 animate-in fade-in duration-700'>
            {/* 响应式工业页眉 */}
            <IndustrialHeader
                icon={BookOpen}
                title={t('engineering.specs.overview.title')}
                description={t('engineering.specs.overview.description')}
                gradient
                statusBadge={
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-primary/5 border border-primary/10 w-fit'>
                        <span className='text-[10px] font-black text-primary/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                        <div className='size-1.5 rounded-full bg-primary animate-pulse' />
                    </div>
                }
            />

            {/* 功能操作行 - 响应式 */}
            <div className='flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/5 p-3 px-4 rounded-[24px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
                <div className='relative w-full sm:w-80 group'>
                    <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors' />
                    <Input 
                        placeholder={t('engineering.specs.placeholders.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className='pl-9 h-10 rounded-xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20 w-full'
                    />
                </div>
                <div className='flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-end'>
                    <AuditTimelineTriggerButton
                        module={AUDIT_MODULES.engineeringSpec}
                        targetName={t('engineering.specs.overview.title')}
                        label={t('common.audit.trigger')}
                        className='h-10 w-full rounded-full px-4 sm:w-auto text-[10px] font-black uppercase'
                    />
                    <Button 
                        onClick={() => { setCurrentRow(undefined); setOpen(true); }} 
                        className='w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest text-white gap-1.5 transition-all active:scale-95'
                    >
                        <Plus className='size-3.5' /> {t('engineering.specs.placeholders.upload')}
                    </Button>
                </div>
            </div>

            {/* Desktop Table View */}
            <Card className='hidden md:block border border-dashed border-muted/50 shadow-none bg-background overflow-hidden rounded-[24px]'>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader className='bg-muted/30 h-11'>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className='text-[10px] font-black uppercase tracking-widest px-4 text-muted-foreground/50'>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center antialiased font-black tracking-widest opacity-20 uppercase text-[10px] italic'>
                                        {t('common.status.syncing')}
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow 
                                        key={row.id} 
                                        className={cn(
                                            'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-12 cursor-pointer',
                                            row.original.item.id === highlightId && 'bg-primary/5 animate-pulse border-2 border-primary/20 shadow-inner'
                                        )}
                                        onClick={() => handlePreview(row.original.item)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='px-4'>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30 antialiased font-black tracking-widest uppercase text-[10px] italic'>
                                        {t('engineering.specs.table.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className='md:hidden flex flex-col gap-4'>
                {isLoading ? (
                    <div className='p-12 text-center text-[10px] font-black italic uppercase text-muted-foreground animate-pulse'>{t('common.status.syncing')}</div>
                ) : filteredData.length === 0 ? (
                    <div className='p-12 text-center bg-muted/5 rounded-[28px] border border-dashed border-muted/50 italic text-[10px] text-muted-foreground opacity-40 uppercase'>{t('engineering.specs.table.empty')}</div>
                ) : (
                    filteredData.map((row) => {
                        const item = row.item
                        const fileVisual = getEngineeringDbFileVisual({ extension: item.fileExtension, category: 'SPEC' })
                        const Icon = fileVisual.icon
                        return (
                            <div 
                                key={item.id}
                                onClick={() => handlePreview(item)}
                                className={cn(
                                    'p-5 rounded-[28px] border border-dashed border-muted/50 bg-background/50 active:scale-[0.98] transition-all relative overflow-hidden group',
                                    item.id === highlightId && 'bg-primary/5 ring-2 ring-primary/20 animate-pulse'
                                )}
                            >
                                <div className='absolute top-0 right-0 p-4 opacity-10'>
                                    <Icon className={cn('size-16', fileVisual.iconClassName)} />
                                </div>
                                
                                <div className='flex flex-col gap-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className={cn('size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm', fileVisual.containerClassName)}>
                                            <Icon className={cn('size-5', fileVisual.iconClassName)} />
                                        </div>
                                        <Badge variant='outline' className='text-[10px] font-black italic font-mono bg-muted/50 border-none text-muted-foreground px-3 rounded-full h-5'>
                                            {t('engineering.specs.table.rev')}: {item.version}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h4 className='text-sm font-black tracking-tight leading-tight group-active:text-primary transition-colors line-clamp-2'>{item.name}</h4>
                                        <div className='flex items-center gap-2 mt-2 font-black uppercase tracking-widest'>
                                            <Badge variant='outline' className='h-4 text-[8px] bg-amber-500/10 text-amber-500 border-none rounded-full px-2'>
                                                {item.category}
                                            </Badge>
                                            <div className='size-1 rounded-full bg-muted-foreground/20' />
                                            <div className='flex items-center gap-1 text-[9px] text-muted-foreground/60 italic font-mono'>
                                                <Hash className='size-2.5 opacity-30' />
                                                {item.id.split('-').pop()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='flex items-center justify-between pt-3 border-t border-dashed border-muted-foreground/10'>
                                        <div className='flex items-center gap-2 text-[9px] text-muted-foreground/40 font-medium italic'>
                                            <Calendar className='size-3 opacity-30' />
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className='flex items-center gap-1.5'>
                                            <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500' onClick={(e) => { e.stopPropagation(); handleDownload(item); }}><Download className='size-3.5' /></Button>
                                            <div onClick={(event) => event.stopPropagation()}>
                                                <AuditTimelineTriggerButton
                                                    module={AUDIT_MODULES.engineeringSpec}
                                                    targetId={item.id}
                                                    targetName={item.name}
                                                    label={t('common.audit.trigger')}
                                                    iconOnly
                                                    className='size-8 rounded-full border-transparent px-0 hover:bg-violet-500/10 hover:text-violet-500'
                                                />
                                            </div>
                                            <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={(e) => { e.stopPropagation(); setCurrentRow(item); setOpen(true); }}><Edit className='size-3.5' /></Button>
                                            <Button 
                                                variant='ghost' 
                                                size='icon' 
                                                className='size-8 rounded-full text-destructive/40' 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    runConfirmedAction({
                                                        confirmKey: 'engineering.specs.toasts.deleteMobileConfirm',
                                                        onAction: async () => {
                                                            if (!item.id) {
                                                                toast.error(t('engineering.specs.toasts.noId'))
                                                                return
                                                            }
                                                            try {
                                                                await deleteMutation.mutateAsync(item.id)
                                                            } catch (error) {
                                                                const message = error instanceof Error ? error.message : t('engineering.specs.toasts.deleteFailed')
                                                                toast.error(message)
                                                            }
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

            <SpecActionDialog
                key={`${currentRow?.id ?? 'new-spec'}-${open ? 'open' : 'closed'}`}
                open={open}
                onOpenChange={setOpen}
                currentRow={currentRow}
                onSave={handleSave}
                isLoading={saveMutation.isPending}
            />
            <CADViewerDialog open={cadPreviewOpen} onOpenChange={setCadPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <PDFViewerDialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} />
            <ExcelViewerDialog open={excelPreviewOpen} onOpenChange={setExcelPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} />
        </div>
    )
}

'use client'

import { useMemo, useState } from 'react'
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
import { Search, Plus, Edit, Trash2, BookOpen, FileSpreadsheet, FileText, Download, Eye, Hash, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { type TechnicalSpec } from '../data/schema'
import { SpecsService } from '../services/specs-service'
import { FileResolverService } from '../services/file-resolver-service'
import { SpecActionDialog } from '../components/spec-action-dialog'
import { toast } from 'sonner'
import { CADViewerDialog } from '../components/cad-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'

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
            delta?: any
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
        return data.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [data, searchTerm])

    const getFileInfo = (ext?: string) => {
        const lowerExt = ext?.toLowerCase()
        const isExcel = ['xlsx', 'xls', 'csv'].includes(lowerExt || '')
        const isWord = ['docx', 'doc'].includes(lowerExt || '')
        const Icon = isExcel ? FileSpreadsheet : isWord ? FileText : BookOpen
        const colorClass = isExcel ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                         isWord ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : 
                         'text-amber-500 bg-amber-500/10 border-amber-500/20'
        return { Icon, colorClass }
    }

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
            const ext = item.fileExtension?.toLowerCase()
            setPreviewFile({ url: resolvedUrl, name: item.name })
            if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
                setExcelPreviewOpen(true)
            } else {
                setPdfPreviewOpen(true)
            }
        } else {
            toast.error(t('engineering.specs.toasts.noFile'))
        }
    }

    const columns: ColumnDef<TechnicalSpec>[] = [
        {
            accessorKey: 'name',
            header: t('engineering.specs.table.name'),
            cell: ({ row }) => {
                const info = getFileInfo(row.original.fileExtension)
                const Icon = info.Icon
                return (
                    <div className='flex items-center gap-3'>
                        <div className={`size-10 rounded-lg border ${info.colorClass} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                            <Icon className='size-5' />
                        </div>
                        <div className='flex flex-col'>
                            <span className='font-bold text-sm text-foreground'>{row.original.name}</span>
                            <div className='flex items-center gap-2 mt-1'>
                                <Badge variant='outline' className='text-[10px] h-4 px-1.5 py-0 bg-muted/50 text-muted-foreground uppercase font-mono font-bold border-none'>
                                    {row.original.fileExtension || 'PDF'}
                                </Badge>
                                <span className='text-[10px] text-muted-foreground font-medium uppercase tracking-tight'>
                                    {t('engineering.specs.table.version')}: {row.original.version} | 
                                    {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: 'category',
            header: t('engineering.specs.table.category'),
            cell: ({ row }) => (
                <Badge variant='outline' className='w-fit h-5 text-[10px] px-2 rounded-full font-bold bg-amber-500/10 text-amber-500 border-amber-500/20 whitespace-nowrap'>
                    {row.original.category}
                </Badge>
            )
        },
        {
            accessorKey: 'description',
            header: t('engineering.specs.table.description'),
            cell: ({ row }) => (
                <p className='text-[12px] text-muted-foreground max-w-[200px] truncate italic font-medium'>
                    {row.original.description || t('engineering.specs.table.noDesc')}
                </p>
            )
        },
        {
            id: 'actions',
            header: t('engineering.specs.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500' onClick={() => handleDownload(row.original)}><Download className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500' onClick={() => handlePreview(row.original)}><Eye className='size-3.5' /></Button>
                    <div className='w-px h-4 bg-border mx-1' />
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original); setOpen(true); }}><Edit className='size-3.5' /></Button>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full text-destructive hover:bg-destructive/10' 
                        onClick={() => runConfirmedAction({
                            confirmKey: 'engineering.specs.toasts.deleteConfirm',
                            onAction: async () => {
                                if (!row.original.id) {
                                    toast.error(t('engineering.specs.toasts.noId'))
                                    return
                                }
                                try {
                                    await deleteMutation.mutateAsync(row.original.id)
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

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const handleSave = async (params: { 
        data: TechnicalSpec; 
        isPatch: boolean; 
        delta?: any; 
        version?: number 
    }) => {
        const { data: formData, isPatch, delta, version } = params
        
        await saveMutation.mutateAsync({ data: formData, isPatch, delta, version })
    }

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            {/* 响应式工业页眉 */}
            <div className='flex flex-col gap-2 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
                <div className='flex items-center gap-2 text-primary'>
                    <BookOpen className='size-4 md:size-5 text-primary' />
                    <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase'>{t('engineering.specs.overview.title')}</h3>
                </div>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                    <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 max-w-2xl'>
                        {t('engineering.specs.overview.description')}
                    </p>
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-primary/5 border border-primary/10 w-fit'>
                        <span className='text-[10px] font-black text-primary/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                        <div className='size-1.5 rounded-full bg-primary animate-pulse' />
                    </div>
                </div>
            </div>

            {/* 功能操作行 - 响应式 */}
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
                <div className='relative w-full sm:w-96 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
                    <Input 
                        placeholder={t('engineering.specs.placeholders.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className='pl-10 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20 w-full'
                    />
                </div>
                <Button 
                    onClick={() => { setCurrentRow(undefined); setOpen(true); }} 
                    className='w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all active:scale-95'
                >
                    <Plus className='size-4' /> {t('engineering.specs.placeholders.upload')}
                </Button>
            </div>

            {/* Desktop Table View */}
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
                                            'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16 cursor-pointer',
                                            row.original.id === highlightId && 'bg-primary/5 animate-pulse border-2 border-primary/20 shadow-inner'
                                        )}
                                        onClick={() => handlePreview(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='px-6'>
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
                    filteredData.map((item) => {
                        const info = getFileInfo(item.fileExtension)
                        const Icon = info.Icon
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
                                    <Icon className={cn('size-16', info.colorClass.split(' ')[0])} />
                                </div>
                                
                                <div className='flex flex-col gap-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className={cn('size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm', info.colorClass)}>
                                            <Icon className='size-5' />
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

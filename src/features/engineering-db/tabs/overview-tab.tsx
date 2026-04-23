'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Search, FileText, Eye, ArrowUpRight, Hash, Clock } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { FileResolverService } from '../services/file-resolver-service'
import { CADViewerDialog } from '../components/cad-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { useLanguage } from '@/context/language-provider'
import { type UnifiedEntry, useEngineeringDbOverview } from '../hooks/use-engineering-db-overview'
import {
    getEngineeringDbCategoryBadgeClass,
    getEngineeringDbCategoryLabel,
    getEngineeringDbFileVisual,
    getEngineeringDbPreviewKind,
    getEngineeringDbSubtypeLabel,
    normalizeEngineeringDbFileExtension,
} from '../view-helpers'

export function OverviewTab() {
    const { t } = useLanguage()
    const [searchTerm, setSearchTerm] = useState('')
    const navigate = useNavigate()
    const { data, filteredData, productMap, stats, isLoading: loading } = useEngineeringDbOverview(searchTerm)

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
    const statCards = useMemo(() => [
        { label: t('engineering.db.stats.technicalSpecs'), count: stats.specCount, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: t('engineering.db.stats.drillingPlans'), count: stats.drillingCount, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { label: '裁砂方案', count: stats.cuttingCount, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: t('engineering.db.stats.labelingDrafts'), count: stats.labelingCount, color: 'text-teal-500', bg: 'bg-teal-500/10' },
        { label: t('engineering.db.stats.excelSheets'), count: stats.excelCount, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: t('engineering.db.stats.cadDrawings'), count: stats.cadCount, color: 'text-orange-500', bg: 'bg-orange-500/10' }
    ], [stats, t])

    const handlePreview = async (item: UnifiedEntry) => {
        if (item.fileUrl) {
            const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
            if (!resolvedUrl) {
                toast.error(t('engineering.db.status.unResolved'))
                return
            }
            const product = productMap.get(item.relationId || '')
            setPreviewFile({
                url: resolvedUrl,
                name: item.name,
                sku: product?.sku
            })

            const previewKind = getEngineeringDbPreviewKind(item.fileExtension)
            if (previewKind === 'excel') {
                setExcelPreviewOpen(true)
            } else if (previewKind === 'cad') {
                setCadPreviewOpen(true)
            } else {
                setPdfPreviewOpen(true)
            }
        } else {
            toast.error(t('engineering.db.status.noAttachment'))
        }
    }

    const columns: ColumnDef<UnifiedEntry>[] = [
        {
            accessorKey: 'name',
            header: t('engineering.db.table.topic'),
            cell: ({ row }) => {
                const item = row.original
                const ext = normalizeEngineeringDbFileExtension(item.fileExtension)
                const fileVisual = getEngineeringDbFileVisual({ extension: item.fileExtension, category: item.category })
                const Icon = fileVisual.icon

                return (
                    <div className='flex items-center gap-3'>
                        <div className={`size-9 rounded-lg border ${fileVisual.containerClassName} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                            <Icon className={`size-5 ${fileVisual.iconClassName}`} />
                        </div>
                        <div className='flex flex-col'>
                            <span className='font-bold text-sm text-foreground group-hover:text-primary transition-colors'>{item.name}</span>
                            <div className='flex items-center gap-2 mt-0.5'>
                                <Badge variant='outline' className='h-3.5 px-1 text-[9px] font-black uppercase bg-muted/50 border-none'>
                                    {ext || t('engineering.db.table.na')}
                                </Badge>
                                <span className='text-[10px] text-muted-foreground/50'>•</span>
                                <span className='text-[10px] text-muted-foreground font-mono'>{item.id}</span>
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            header: t('engineering.db.table.category'),
            cell: ({ row }) => {
                const categoryLabel = getEngineeringDbCategoryLabel(t, row.original.category)
                const colorClass = getEngineeringDbCategoryBadgeClass(row.original.category)
                const subTypeLabel = getEngineeringDbSubtypeLabel(t, row.original.subType)
                return (
                    <div className='flex flex-col gap-1'>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full w-fit uppercase tracking-tighter ${colorClass}`}>
                            {categoryLabel}
                        </span>
                        <span className='text-[11px] font-medium text-muted-foreground ml-1'>
                            {subTypeLabel}
                        </span>
                    </div>
                )
            }
        },
        {
            header: t('engineering.db.table.relation'),
            cell: ({ row }) => {
                const product = productMap.get(row.original.relationId || '')
                if (!row.original.relationId) return <span className='text-[11px] text-muted-foreground/30 italic'>{t('engineering.db.table.global')}</span>
                return (
                    <div className='flex flex-col'>
                        <span className='text-[11px] font-black uppercase font-mono text-muted-foreground'>
                            {product?.sku || 'UNKNOWN'}
                        </span>
                        <span className='text-[10px] text-muted-foreground truncate max-w-[120px]'>
                            {product?.name || t('engineering.db.table.orphan')}
                        </span>
                    </div>
                )
            }
        },
        {
            accessorKey: 'createdAt',
            header: t('engineering.db.table.lastUpdate'),
            cell: ({ row }) => (
                <span className='text-[11px] text-muted-foreground font-medium'>
                    {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : t('engineering.db.table.na')}
                </span>
            )
        },
        {
            id: 'actions',
            header: t('engineering.db.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2'>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full hover:bg-primary/10 transition-colors' 
                        onClick={() => handlePreview(row.original)}
                    >
                        <Eye className='size-3.5' />
                    </Button>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full hover:bg-violet-500/10 hover:text-violet-500' 
                        onClick={() => {
                            const mapping = { SPEC: '/engineering-db/specs', DRILLING: '/engineering-db/drilling', CUTTING: '/engineering-db/cutting-plan', LABELING: '/engineering-db/labeling' }
                            const to = mapping[row.original.category]
                            navigate({ to, search: { highlightId: row.original.id } } as any)
                        }}
                    >
                        <ArrowUpRight className='size-3.5' />
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

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            {/* 响应式工业页眉 */}
            <IndustrialHeader
                icon={FileText}
                title={t('engineering.db.overview.title')}
                description={t('engineering.db.overview.description')}
                gradient
                statusBadge={
                    <div className='flex items-center gap-4 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 w-fit'>
                        <span className='text-[9px] font-black text-primary/60 uppercase tracking-widest'>{t('engineering.db.status.syncReady')}</span>
                        <div className='size-1.5 rounded-full bg-primary animate-pulse' />
                    </div>
                }
            />

            {/* 功能栏与统计 - 响应式栅格 */}
            <div className='flex flex-col gap-4 md:gap-6 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted/50 shadow-inner'>
                <div className='flex flex-col lg:flex-row items-center justify-between gap-4'>
                    <div className='relative w-full lg:max-w-md group'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
                        <Input 
                            placeholder={t('engineering.db.overview.searchPlaceholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className='pl-12 h-12 md:h-14 rounded-[20px] border-none bg-background shadow-lg text-sm font-bold placeholder:text-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-primary/20 w-full'
                        />
                    </div>
                    <div className='flex items-center gap-2 self-end lg:self-auto'>
                        <div className='px-4 py-2 rounded-2xl bg-background border border-dashed border-muted/50 flex flex-col items-center justify-center min-w-[100px]'>
                            <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('engineering.db.stats.total')}</span>
                            <span className='text-lg font-black text-primary italic'>{data.length}</span>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4'>
                    {statCards.map((stat, idx) => (
                        <div key={idx} className={`flex flex-col gap-1 ${stat.bg} p-4 md:p-5 rounded-[20px] md:rounded-[24px] border border-white/5 shadow-sm hover:scale-[1.02] transition-all cursor-default`}>
                            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60 ${stat.color}`}>{stat.label}</span>
                            <div className='text-2xl md:text-3xl font-black italic tabular-nums tracking-tighter'>{stat.count}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 列表区域 - Desktop Table */}
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
                            {loading ? (
                                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center'>{t('engineering.db.status.loading')}</TableCell></TableRow>
                            ) : filteredData.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className='group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16 cursor-pointer' onClick={() => handlePreview(row.original)}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='px-6'>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30 italic'>{t('engineering.db.status.noData')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 列表区域 - Mobile Card View */}
            <div className='md:hidden flex flex-col gap-4'>
                {loading ? (
                    <div className='p-12 text-center text-[10px] font-black italic uppercase text-muted-foreground animate-pulse'>{t('engineering.db.status.aggregating')}</div>
                ) : filteredData.length === 0 ? (
                    <div className='p-12 text-center bg-muted/5 rounded-[28px] border border-dashed border-muted/50 italic text-[10px] text-muted-foreground opacity-40 uppercase'>{t('engineering.db.status.noData')}</div>
                ) : (
                    filteredData.map((item) => {
                        const product = productMap.get(item.relationId || '')
                        const fileVisual = getEngineeringDbFileVisual({ extension: item.fileExtension, category: item.category })
                        const Icon = fileVisual.icon
                        const mobileCategoryLabel = getEngineeringDbCategoryLabel(t, item.category)
                        const mobileSubTypeLabel = getEngineeringDbSubtypeLabel(t, item.subType)

                        return (
                            <div 
                                key={item.id}
                                onClick={() => handlePreview(item)}
                                className='p-5 rounded-[28px] border border-dashed border-muted/50 bg-background/50 active:scale-[0.98] transition-all relative overflow-hidden group'
                            >
                                <div className={`absolute top-0 right-0 p-4 opacity-20`}>
                                    <Icon className={`size-12 ${fileVisual.iconClassName}`} />
                                </div>
                                
                                <div className='flex flex-col gap-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className={`size-8 rounded-lg border ${fileVisual.containerClassName} flex items-center justify-center`}>
                                            <Icon className={`size-4 ${fileVisual.iconClassName}`} />
                                        </div>
                                        {product?.sku && (
                                            <Badge variant='outline' className='text-[10px] font-black italic font-mono bg-primary/5 border-none text-primary px-3 rounded-full h-5 leading-none'>
                                                {product.sku}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <h4 className='text-sm font-black tracking-tight leading-tight group-hover:text-primary transition-colors'>{item.name}</h4>
                                        <div className='flex items-center gap-2 mt-1.5'>
                                            <span className='text-[10px] font-black text-muted-foreground/60 italic uppercase tracking-tighter'>
                                                {mobileCategoryLabel}
                                            </span>
                                            <div className='size-1 rounded-full bg-muted-foreground/20' />
                                            <span className='text-[10px] font-bold text-muted-foreground opacity-50'>{mobileSubTypeLabel}</span>
                                        </div>
                                    </div>
                                    
                                    <div className='flex items-center justify-between pt-2 border-t border-dashed border-muted/50'>
                                        <div className='flex items-center gap-3'>
                                            <div className='flex items-center gap-1.5'>
                                                <Hash className='size-3 text-muted-foreground/30' />
                                                <span className='text-[9px] font-mono text-muted-foreground/60 uppercase'>{item.id}</span>
                                            </div>
                                            <div className='flex items-center gap-1.5'>
                                                <Clock className='size-3 text-muted-foreground/20' />
                                                <span className='text-[9px] font-medium text-muted-foreground/40 italic'>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <Button 
                                                variant='ghost' 
                                                size='icon' 
                                                className='size-8 rounded-full hover:bg-violet-500/10 hover:text-violet-500'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const mapping = { SPEC: '/engineering-db/specs', DRILLING: '/engineering-db/drilling', CUTTING: '/engineering-db/cutting-plan', LABELING: '/engineering-db/labeling' }
                                                    const to = mapping[item.category]
                                                    navigate({ to, search: { highlightId: item.id } } as any)
                                                }}
                                            >
                                                <ArrowUpRight className='size-3.5' />
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

            <CADViewerDialog open={cadPreviewOpen} onOpenChange={setCadPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <PDFViewerDialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <ExcelViewerDialog open={excelPreviewOpen} onOpenChange={setExcelPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
        </div>
    )
}

'use client'

import { useState } from 'react'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Plus, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
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
import { type SpokeLength } from '../data/schema'
import { FileResolverService } from '../services/file-resolver-service'
import { SpokeLengthActionDialog } from '../components/spoke-length-action-dialog'
import { SpokeLengthPreviewDialog } from '../components/spoke-length-preview-dialog'
import { useSpokeLengthMgmt } from '../hooks/use-spoke-length-mgmt'
import { useSpokeLengthColumns } from '../hooks/use-spoke-length-columns'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { toast } from 'sonner'

export function SpokeLengthTab() {
    const { t } = useLanguage()
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-db/spoke-length' })
    const {
        filteredData,
        isLoading,
        searchTerm,
        setSearchTerm,
        productMap,
        hubMap,
        nippleMap,
        handleDelete,
        handleSave,
        refresh
    } = useSpokeLengthMgmt()

    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<SpokeLength | undefined>(undefined)
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    const handlePreview = async (item: SpokeLength) => {
        if (item.fileUrl) {
            const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
            if (!resolvedUrl) {
                toast.error(t('engineering.spokeLength.toasts.unResolved'))
                return
            }
            setPreviewFile({ url: resolvedUrl, name: item.name })
            setImagePreviewOpen(true)
        } else {
            toast.error(t('engineering.spokeLength.toasts.noFile'))
        }
    }

    const columns = useSpokeLengthColumns({
        t: t as any,
        productMap,
        hubMap,
        nippleMap,
        onPreview: handlePreview,
        onEdit: (item) => { 
            setCurrentRow(item)
            setOpen(true) 
        },
        onDelete: handleDelete
    })

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader 
                icon={Ruler}
                title={t('engineering.spokeLength.overview.title')}
                description={t('engineering.spokeLength.overview.description')}
                gradient
                statusBadge={
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 w-fit'>
                        <span className='text-[10px] font-black text-indigo-600/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                        <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    </div>
                }
                innerClassName='text-indigo-600'
            />

            <IndustrialActionBar 
                searchPlaceholder={t('engineering.spokeLength.placeholders.search')}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                onRefresh={refresh}
                isRefreshing={isLoading}
                rightContent={
                    <Button 
                        onClick={() => { setCurrentRow(undefined); setOpen(true); }} 
                        className='w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all active:scale-95'
                    >
                        <Plus className='size-4' /> {t('engineering.spokeLength.table.upload')}
                    </Button>
                }
                className='border-indigo-600/10'
            />

            {/* 数据表格 */}
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
                                        className={cn(
                                            'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-20',
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
                                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30'>{t('engineering.spokeLength.table.empty')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className='pt-2'>
                <DataTablePagination table={table} />
            </div>

            <SpokeLengthActionDialog open={open} onOpenChange={setOpen} currentRow={currentRow} onSave={handleSave} />
            <SpokeLengthPreviewDialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen} previewFile={previewFile} />
        </div>
    )
}

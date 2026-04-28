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
import { ForbiddenState } from '@/components/forbidden-state'
import { cn } from '@/lib/utils'
import { isForbiddenError } from '@/lib/error-status'
import { AlertCircle, Plus, RefreshCw, Ruler } from 'lucide-react'
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
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-reference/spoke-length' })
    const {
        readResource,
        filteredData,
        isLoading,
        isRefreshing,
        searchTerm,
        setSearchTerm,
        handleDelete,
        handleSave,
        refresh,
        retryRead,
    } = useSpokeLengthMgmt()

    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<SpokeLength | undefined>(undefined)
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    const statusBadge = readResource.status === 'error' ? (
        <div className='flex items-center gap-4 rounded-full border border-rose-500/15 bg-rose-500/5 px-4 py-1 w-fit'>
            <span className='text-[10px] font-black text-rose-700 uppercase tracking-widest'>读取异常</span>
            <div className='size-1.5 rounded-full bg-rose-500' />
        </div>
    ) : readResource.status === 'loading' ? (
        <div className='flex items-center gap-4 rounded-full border border-amber-500/15 bg-amber-500/5 px-4 py-1 w-fit'>
            <span className='text-[10px] font-black text-amber-700 uppercase tracking-widest'>{t('common.status.syncing')}</span>
            <RefreshCw className='size-3.5 animate-spin text-amber-500' />
        </div>
    ) : (
        <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 w-fit'>
            <span className='text-[10px] font-black text-indigo-600/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
            <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
        </div>
    )

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
        t,
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

    if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader 
                icon={Ruler}
                title={t('engineering.spokeLength.overview.title')}
                description={t('engineering.spokeLength.overview.description')}
                gradient
                statusBadge={statusBadge}
                innerClassName='text-indigo-600'
            />

            {readResource.status === 'error' ? (
                <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                    <AlertCircle className='size-8 text-rose-500' />
                    <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>辐条关联库加载失败</p>
                    <p className='mt-3 max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
                        {readResource.error.message || '请重试后再查看辐条关联库。'}
                    </p>
                    <Button
                        type='button'
                        variant='outline'
                        className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
                        onClick={() => {
                            void retryRead()
                        }}
                    >
                        <RefreshCw className='size-3.5' />
                        重试
                    </Button>
                </div>
            ) : (
                <>

                <IndustrialActionBar 
                    searchPlaceholder={t('engineering.spokeLength.placeholders.search')}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    onRefresh={refresh}
                    isRefreshing={isRefreshing}
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
                                                row.original.item.id === highlightId && 'bg-primary/5 animate-pulse border-2 border-primary/20 shadow-inner'
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
                </>
            )}

            {open ? (
                <SpokeLengthActionDialog open={open} onOpenChange={setOpen} currentRow={currentRow} onSave={handleSave} />
            ) : null}
            {imagePreviewOpen ? (
                <SpokeLengthPreviewDialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen} previewFile={previewFile} />
            ) : null}
        </div>
    )
}

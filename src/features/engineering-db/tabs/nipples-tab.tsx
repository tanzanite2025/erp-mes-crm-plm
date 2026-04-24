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
import { Layers, Plus, Search, Eye, Edit2, Trash2, Box, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type Nipple } from '../data/nipple-schema'
import { nippleService } from '../services/nipple-service'
import { NippleActionDialog } from '../components/nipple-action-dialog'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ENGINEERING_DB_NIPPLES_QUERY_KEY } from '../query-keys'

type NipplesRowViewModel = {
    item: Nipple
    searchText: string
}

export function NipplesTab() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-reference/nipples' })
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<Nipple | undefined>(undefined)
    
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    const { data = [], isLoading } = useQuery({
        queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
        queryFn: () => nippleService.getNipples(),
    })

    const saveMutation = useMutation({
        mutationFn: async (params: {
            data: Nipple
            isPatch: boolean
            delta?: any
            version?: number
        }) => {
            const { data: nextData, isPatch, delta, version } = params
            if (isPatch && delta) {
                await nippleService.patchNipple(nextData.id, delta, version!)
                return
            }

            await nippleService.saveNipple(nextData)
        },
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY })
            setOpen(false)
            setCurrentRow(undefined)
            toast.success(
                variables.isPatch
                    ? t('engineering.nipples.toasts.updateSuccess')
                    : t('engineering.nipples.toasts.saveSuccess')
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => nippleService.deleteNipple(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY })
            toast.success(t('engineering.nipples.toasts.deleteSuccess'))
        },
    })

    const filteredData = useMemo(() => {
        const rows = data.map<NipplesRowViewModel>((item) => ({
            item,
            searchText: [
                item.name,
                item.brand || '',
                item.material || '',
                item.color || '',
                item.length || '',
            ].join(' ').toLowerCase(),
        }))

        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return rows
        }

        return rows.filter((row) => row.searchText.includes(normalizedSearch))
    }, [data, searchTerm])

    const handlePreview = (item: Nipple) => {
        if (item.fileUrl) {
            setPreviewFile({ url: item.fileUrl, name: item.name })
            setImagePreviewOpen(true)
        } else {
            toast.error(t('engineering.db.status.noAttachment'))
        }
    }

    const handleDelete = async (id: string) => {
        runConfirmedAction({
            confirmKey: 'engineering.nipples.toasts.deleteConfirm',
            onAction: async () => {
                await deleteMutation.mutateAsync(id)
            }
        })
    }

    const columns: ColumnDef<NipplesRowViewModel>[] = [
        {
            accessorKey: 'item.name',
            header: t('engineering.nipples.table.name'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-lg border border-orange-500/20 bg-orange-500/10 flex items-center justify-center shrink-0 shadow-sm'>
                        <Box className='size-5 text-orange-600' />
                    </div>
                    <div className='flex flex-col text-left'>
                        <span className='font-bold text-sm text-foreground'>{row.original.item.name}</span>
                        <span className='text-[10px] text-muted-foreground uppercase font-mono tracking-widest'>{row.original.item.brand || 'GENERIC'}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'item.length',
            header: t('engineering.nipples.table.length'),
            cell: ({ row }) => <span className='font-black text-sm italic text-orange-600'>{row.original.item.length ? `${row.original.item.length}mm` : '--'}</span>
        },
        {
            accessorKey: 'item.material',
            header: t('engineering.nipples.table.material'),
            cell: ({ row }) => <Badge variant='outline' className='bg-muted/50 border-none font-bold uppercase text-[10px]'>{row.original.item.material || '--'}</Badge>
        },
        {
            accessorKey: 'item.color',
            header: t('engineering.nipples.table.color'),
            cell: ({ row }) => <span className='text-[11px] font-medium text-muted-foreground'>{row.original.item.color || '--'}</span>
        },
        {
            id: 'actions',
            header: t('engineering.nipples.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1 justify-end'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => handlePreview(row.original.item)}><Eye className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original.item); setOpen(true); }}><Edit2 className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive' onClick={() => handleDelete(row.original.item.id)}><Trash2 className='size-3.5' /></Button>
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
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={Layers}
                title={`${t('engineering.nipples.overview.title')} / ${t('common.actions.preview')}`}
                description={t('engineering.nipples.overview.description')}
                gradient
                innerClassName='text-orange-600'
                statusBadge={
                    <div className='flex items-center gap-4 relative'>
                        <div className='hidden md:flex flex-col items-end mr-4'>
                            <span className='text-[8px] font-mono opacity-40 uppercase tracking-tighter'>SYSTEM_VAULT_STATUS</span>
                            <span className='text-[10px] font-black italic text-orange-600'>SYNCHRONIZED</span>
                        </div>
                        <Button 
                            onClick={() => { setCurrentRow(undefined); setOpen(true); }}
                            className='rounded-full h-12 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-600/20 bg-orange-600 hover:bg-orange-700 text-white'
                        >
                            <Plus className='mr-2 h-4 w-4' /> {t('engineering.nipples.table.upload')}
                        </Button>
                    </div>
                }
                className='border-muted-foreground/10'
            />

            {/* Table Section */}
            <div className='bg-background/50 rounded-[24px] border border-dashed border-muted-foreground/10 overflow-hidden backdrop-blur-sm'>
                <div className='p-6 border-b border-dashed border-muted-foreground/10 flex items-center gap-4'>
                    <div className='relative flex-1 max-w-sm'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40' />
                        <Input 
                            placeholder={t('engineering.nipples.placeholders.search')}
                            className='h-11 pl-10 rounded-2xl border-none bg-muted/30 font-bold text-[11px] shadow-inner'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className='p-0 overflow-x-auto'>
                    <Table>
                        <TableHeader className='bg-muted/30 h-14'>
                            {table.getHeaderGroups().map(hg => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map(h => <TableHead key={h.id} className='text-[10px] font-black uppercase tracking-widest px-6'>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center'>
                                        <div className='flex flex-col items-center gap-2 opacity-40'>
                                            <div className='size-8 rounded-full border-2 border-orange-600 border-t-transparent animate-spin' />
                                            <span className='text-[10px] font-black uppercase tracking-widest'>{t('common.status.syncing')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} className={cn('hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16', row.original.item.id === highlightId && 'bg-primary/5')}>
                                        {row.getVisibleCells().map(cell => <TableCell key={cell.id} className='px-6'>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center'>
                                        <div className='flex flex-col items-center gap-2 opacity-20'>
                                            <Box className='size-12 stroke-[1px]' />
                                            <span className='text-[10px] font-black uppercase tracking-widest'>{t('engineering.nipples.table.empty')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <div className='p-4 border-t border-dashed border-muted-foreground/10'>
                    <DataTablePagination table={table} />
                </div>
            </div>

            <NippleActionDialog 
                open={open}
                onOpenChange={setOpen}
                currentRow={currentRow}
                onSave={({ data: val, isPatch, delta, version }) => {
                    void saveMutation.mutateAsync({ data: val, isPatch, delta, version })
                }}
                isLoading={saveMutation.isPending}
            />
            
            <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
                <DialogContent className='sm:max-w-3xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl'>
                    <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative bg-muted/5 border-b border-dashed border-muted-foreground/10 h-20 flex flex-col justify-center'>
                        <DialogTitle className='text-sm font-black italic uppercase tracking-widest flex items-center gap-2'>
                            <ImageIcon className='size-4 text-orange-600' />
                            {previewFile?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className='p-4 flex items-center justify-center bg-muted/10 min-h-[300px]'>
                        <img src={previewFile?.url} className='max-w-full max-h-[70vh] rounded-2xl object-contain border-4 border-white shadow-2xl' />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

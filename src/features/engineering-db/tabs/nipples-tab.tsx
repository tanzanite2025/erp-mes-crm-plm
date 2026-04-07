'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { type Nipple } from '../data/nipple-schema'
import { nippleService } from '../services/nipple-service'
import { NippleActionDialog } from '../components/nipple-action-dialog'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'

export function NipplesTab() {
    const { t } = useLanguage()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const [data, setData] = useState<Nipple[]>([])
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-db/nipples' })
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<Nipple | undefined>(undefined)
    
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const results = await nippleService.getNipples()
                setData(results)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const searchStr = searchTerm.toLowerCase()
            return item.name.toLowerCase().includes(searchStr) ||
                   (item.brand || '').toLowerCase().includes(searchStr) ||
                   (item.material || '').toLowerCase().includes(searchStr)
        })
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
                await nippleService.deleteNipple(id)
                setData(prev => prev.filter(item => item.id !== id))
                toast.success(t('engineering.nipples.toasts.deleteSuccess'))
            }
        })
    }

    const columns: ColumnDef<Nipple>[] = [
        {
            accessorKey: 'name',
            header: t('engineering.nipples.table.name'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-lg border border-orange-500/20 bg-orange-500/10 flex items-center justify-center shrink-0 shadow-sm'>
                        <Box className='size-5 text-orange-600' />
                    </div>
                    <div className='flex flex-col text-left'>
                        <span className='font-bold text-sm text-foreground'>{row.original.name}</span>
                        <span className='text-[10px] text-muted-foreground uppercase font-mono tracking-widest'>{row.original.brand || 'GENERIC'}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'length',
            header: t('engineering.nipples.table.length'),
            cell: ({ row }) => <span className='font-black text-sm italic text-orange-600'>{row.original.length ? `${row.original.length}mm` : '--'}</span>
        },
        {
            accessorKey: 'material',
            header: t('engineering.nipples.table.material'),
            cell: ({ row }) => <Badge variant='outline' className='bg-muted/50 border-none font-bold uppercase text-[10px]'>{row.original.material || '--'}</Badge>
        },
        {
            accessorKey: 'color',
            header: t('engineering.nipples.table.color'),
            cell: ({ row }) => <span className='text-[11px] font-medium text-muted-foreground'>{row.original.color || '--'}</span>
        },
        {
            id: 'actions',
            header: t('engineering.nipples.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1 justify-end'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => handlePreview(row.original)}><Eye className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original); setOpen(true); }}><Edit2 className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive' onClick={() => handleDelete(row.original.id)}><Trash2 className='size-3.5' /></Button>
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
            {/* Header Section */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 bg-muted/5 p-8 rounded-[32px] md:rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-br from-orange-500/5 via-transparent pointer-events-none' />
                <div className='space-y-1.5 relative'>
                    <div className='flex items-center gap-3 mb-1'>
                        <div className='h-8 w-8 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20'>
                            <Layers className='h-4 w-4 text-white' />
                        </div>
                        <h1 className='text-lg font-black italic uppercase tracking-tighter'>
                            {t('engineering.nipples.overview.title')} / {t('common.actions.preview')}
                        </h1>
                    </div>
                    <p className='text-[9px] font-black uppercase tracking-widest opacity-60 ml-11'>
                        {t('engineering.nipples.overview.description')}
                    </p>
                </div>
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
            </div>

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
                                    <TableRow key={row.id} className={cn('hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16', row.original.id === highlightId && 'bg-primary/5')}>
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
                    const newData = currentRow ? data.map(d => d.id === val.id ? val : d) : [val, ...data]
                    setData(newData)
                    if (isPatch && delta) {
                        nippleService.patchNipple(val.id, delta, version!)
                        toast.success(t('engineering.nipples.toasts.updateSuccess'))
                    } else {
                        nippleService.saveNipple(val)
                        toast.success(t('engineering.nipples.toasts.saveSuccess'))
                    }
                }}
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

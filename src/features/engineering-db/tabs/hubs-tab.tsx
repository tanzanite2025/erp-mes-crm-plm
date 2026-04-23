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
import { Search, Plus, Edit, Trash2, Cpu, ImageIcon, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type Hub } from '../data/hub-schema'
import { hubService } from '../services/hub-service'
import { HubActionDialog } from '../components/hub-action-dialog'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ENGINEERING_DB_HUBS_QUERY_KEY } from '../query-keys'

type HubsRowViewModel = {
    item: Hub
    searchText: string
}

export function HubsTab() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const { highlightId } = useSearch({ from: '/_authenticated/engineering-db/hubs' })
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<Hub | undefined>(undefined)
    
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    const { data = [], isLoading } = useQuery({
        queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
        queryFn: () => hubService.getHubs(),
    })

    const saveMutation = useMutation({
        mutationFn: async (params: {
            data: Hub
            isPatch: boolean
            delta?: any
            version?: number
        }) => {
            const { data: nextData, isPatch, delta, version } = params
            if (isPatch && delta) {
                await hubService.patchHub(nextData.id, delta, version!)
                return
            }
            await hubService.saveHub(nextData)
        },
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_HUBS_QUERY_KEY })
            setOpen(false)
            setCurrentRow(undefined)
            toast.success(
                variables.isPatch
                    ? t('engineering.hubs.toasts.updateSuccess')
                    : t('engineering.hubs.toasts.saveSuccess')
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => hubService.deleteHub(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_HUBS_QUERY_KEY })
            toast.success(t('engineering.hubs.toasts.deleteSuccess'))
        },
    })

    const filteredData = useMemo(() => {
        const rows = data.map<HubsRowViewModel>((item) => ({
            item,
            searchText: [
                item.name,
                item.brand || '',
                item.model || '',
                item.holeCount || '',
                item.pcdLeft || '',
                item.pcdRight || '',
                item.flangeLeft || '',
                item.flangeRight || '',
            ].join(' ').toLowerCase(),
        }))

        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return rows
        }

        return rows.filter((row) => row.searchText.includes(normalizedSearch))
    }, [data, searchTerm])

    const handlePreview = (item: Hub) => {
        if (item.fileUrl) {
            setPreviewFile({ url: item.fileUrl, name: item.name })
            setImagePreviewOpen(true)
        } else {
            toast.error(t('engineering.spokeLength.toasts.noFile'))
        }
    }

    const columns: ColumnDef<HubsRowViewModel>[] = [
        {
            accessorKey: 'item.name',
            header: t('engineering.hubs.table.name'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center shrink-0 shadow-sm'>
                        <Cpu className='size-5 text-indigo-600' />
                    </div>
                    <div className='flex flex-col'>
                        <span className='font-bold text-sm text-foreground'>{row.original.item.name}</span>
                        <span className='text-[10px] text-muted-foreground uppercase font-mono tracking-widest'>{row.original.item.brand || t('engineering.labeling.table.generic')}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'item.holeCount',
            header: t('engineering.hubs.table.holes'),
            cell: ({ row }) => <Badge variant='outline' className='bg-muted/50 border-none font-mono'>{row.original.item.holeCount || '--'}H</Badge>
        },
        {
            header: t('engineering.hubs.table.geometry'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2 font-mono text-[11px]'>
                    <span className='text-muted-foreground'>{row.original.item.pcdLeft || '--'}</span>
                    <span className='opacity-20'>/</span>
                    <span className='text-muted-foreground'>{row.original.item.pcdRight || '--'}</span>
                </div>
            )
        },
        {
            header: t('engineering.hubs.table.flange'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2 font-mono text-[11px]'>
                    <span className='text-indigo-600 font-bold'>{row.original.item.flangeLeft || '--'}</span>
                    <span className='opacity-20'>/</span>
                    <span className='text-indigo-600 font-bold'>{row.original.item.flangeRight || '--'}</span>
                </div>
            )
        },
        {
            id: 'actions',
            header: t('engineering.hubs.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => handlePreview(row.original.item)}><Eye className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => { setCurrentRow(row.original.item); setOpen(true); }}><Edit className='size-3.5' /></Button>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full text-destructive' 
                        onClick={() => runConfirmedAction({
                            confirmKey: 'engineering.hubs.toasts.deleteConfirm',
                            onAction: async () => {
                                await deleteMutation.mutateAsync(row.original.item.id)
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

    return (
        <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={Cpu}
                title={t('engineering.hubs.overview.title')}
                description={t('engineering.hubs.overview.description')}
                innerClassName='text-indigo-600'
                className='border-muted-foreground/10'
            />

            <div className='flex items-center justify-between gap-4 bg-muted/5 p-8 rounded-[32px] border border-dashed border-muted-foreground/10 shadow-inner'>
                <div className='relative w-96 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30' />
                    <Input placeholder={t('engineering.hubs.placeholders.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='pl-10 h-12 rounded-2xl border-none bg-background shadow-inner' />
                </div>
                <Button onClick={() => { setCurrentRow(undefined); setOpen(true); }} className='bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all active:scale-95'>
                    <Plus className='size-4' /> {t('engineering.hubs.table.upload')}
                </Button>
            </div>

            <Card className='border border-dashed border-muted/50 shadow-none bg-background overflow-hidden rounded-[24px]'>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader className='bg-muted/30 h-14'>
                            {table.getHeaderGroups().map(hg => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map(h => <TableHead key={h.id} className='text-[10px] font-black uppercase tracking-widest px-6'>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={columns.length} className='h-64 text-center'>{t('common.status.syncing')}</TableCell></TableRow> : 
                             table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className={cn('hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16', row.original.item.id === highlightId && 'bg-primary/5')}>
                                    {row.getVisibleCells().map(cell => <TableCell key={cell.id} className='px-6'>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                                </TableRow>
                             )) : <TableRow><TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30'>{t('engineering.hubs.table.empty')}</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className='pt-2'><DataTablePagination table={table} /></div>

            <HubActionDialog 
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
                    <DialogHeader className='p-6 border-b border-dashed border-muted-foreground/10 bg-muted/5'>
                        <DialogTitle className='text-sm font-black italic uppercase tracking-widest flex items-center gap-2'><ImageIcon className='size-4 text-indigo-600' />{previewFile?.name} / {t('engineering.spokeLength.table.preview')}</DialogTitle>
                    </DialogHeader>
                    <div className='p-4 flex items-center justify-center bg-muted/10 min-h-[300px]'>
                        {previewFile?.url.toLowerCase().endsWith('.pdf') ? <iframe src={previewFile.url} className='w-full h-[600px] rounded-2xl' /> : <img src={previewFile?.url} className='max-w-full max-h-[70vh] rounded-2xl object-contain border-4 border-white' />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

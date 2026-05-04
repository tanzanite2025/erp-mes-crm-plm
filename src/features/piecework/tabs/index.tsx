'use client'

import { useState, useMemo } from 'react'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { Landmark, Plus, Edit, Trash2, Search, Box, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import type { DeltaSet } from '@/lib/delta/types'
import { useGetPieceworkRates, usePieceworkRateMutations } from '../hooks/use-piecework'
import type { PieceworkRate } from '../data/schema'
import { RateActionDialog } from '../components/rate-action-dialog'
import { cn } from '@/lib/utils'

export function PieceworkQuery() {
    const { t } = useLanguage()
    return <Placeholder title={t('piecework.query.title')} />
}

export function PieceworkRules() {
    const { t } = useLanguage()
    const { data: rates = [], isLoading } = useGetPieceworkRates()
    const { saveRateMutation, patchRateMutation, deleteRateMutation } = usePieceworkRateMutations()
    
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<PieceworkRate | null>(null)

    const filteredData = useMemo(() => {
        return rates.filter(item => 
            item.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.productId.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [rates, searchTerm])

    const columns: ColumnDef<PieceworkRate>[] = [
        {
            accessorKey: 'processName',
            header: t('piecework.rules.table.processName'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='p-2 bg-emerald-500/10 rounded-lg text-emerald-600'>
                        <Target className='size-4' />
                    </div>
                    <span className='font-bold text-sm'>{row.original.processName}</span>
                </div>
            )
        },
        {
            accessorKey: 'productId',
            header: t('piecework.rules.table.productSku'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2'>
                    <Box className='size-3 text-muted-foreground' />
                    <span className='font-mono text-[11px] font-black uppercase tracking-tight text-muted-foreground'>
                        {row.original.productId}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'piecePrice',
            header: t('piecework.rules.table.piecePrice'),
            cell: ({ row }) => (
                <span className='font-mono font-black text-emerald-600 text-sm italic'>
                    ¥{row.original.piecePrice.toFixed(2)} / {row.original.unit}
                </span>
            )
        },
        {
            accessorKey: 'status',
            header: t('piecework.rules.table.status'),
            cell: ({ row }) => (
                <Badge 
                    variant='outline' 
                    className={cn(
                        'h-5 text-[9px] font-black uppercase tracking-widest rounded-full px-2',
                        row.original.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-none'
                    )}
                >
                    {row.original.status === 'active'
                        ? t('piecework.rules.status.active')
                        : t('piecework.rules.status.inactive')}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: t('piecework.rules.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full hover:bg-primary/10' 
                        onClick={() => { setCurrentRow(row.original); setOpen(true); }}
                    >
                        <Edit className='size-3.5' />
                    </Button>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-8 rounded-full text-destructive/50 hover:text-destructive hover:bg-destructive/10' 
                        onClick={() => deleteRateMutation.mutate(row.original.id)}
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

    const handleSave = (params: { 
        data: PieceworkRate; 
        isPatch: boolean; 
        delta?: DeltaSet; 
        version?: number 
    }) => {
        const { data: formData, isPatch, delta, version } = params
        if (isPatch && delta) {
            patchRateMutation.mutate({ id: formData.id, delta, version: version! }, {
                onSuccess: () => setOpen(false)
            })
        } else {
            saveRateMutation.mutate(formData, {
                onSuccess: () => setOpen(false)
            })
        }
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={Landmark}
                title={t('piecework.rules.page.headerTitle')}
                description={t('piecework.rules.page.headerDescription')}
                gradient
                innerClassName='text-emerald-600'
                className='border-muted-foreground/10'
                statusBadge={
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 w-fit'>
                        <span className='text-[10px] font-black text-emerald-600/60 uppercase tracking-widest italic'>
                            {t('piecework.rules.page.statusBadge')}
                        </span>
                        <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    </div>
                }
            />

            {/* 操作栏 */}
            <div className='flex items-center justify-between gap-4 bg-muted/5 p-8 rounded-[32px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
                <div className='relative w-96 group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors' />
                    <Input 
                        placeholder={t('piecework.rules.page.searchPlaceholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className='pl-11 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-emerald-500/20'
                    />
                </div>
                <Button 
                    onClick={() => { setCurrentRow(null); setOpen(true); }} 
                    className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest gap-2 active:scale-95 transition-all'
                >
                    <Plus className='size-4' /> {t('piecework.rules.page.add')}
                </Button>
            </div>

            {/* 数据表格 */}
            <Card className='border border-dashed border-muted/50 shadow-none bg-background overflow-hidden rounded-[24px]'>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader className='bg-muted/30 h-14'>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-dashed border-muted/50'>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className='text-[10px] font-black uppercase tracking-widest px-8 text-muted-foreground/40'>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center antialiased font-black tracking-widest opacity-20 uppercase text-[10px] italic'>
                                        {t('piecework.rules.page.loading')}
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className='group hover:bg-emerald-500/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16'>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='px-8'>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30 antialiased font-black tracking-widest uppercase text-[10px] italic'>
                                        {t('piecework.rules.page.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <RateActionDialog 
                open={open} 
                onOpenChange={setOpen} 
                currentRow={currentRow} 
                onSave={handleSave} 
                isLoading={saveRateMutation.isPending || patchRateMutation.isPending}
            />
        </div>
    )
}

export function PieceworkStats() {
    const { t } = useLanguage()
    return <Placeholder title={t('piecework.stats.title')} />
}

function Placeholder({ title }: { title: string }) {
    const { t } = useLanguage()
    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={Landmark}
                title={t('piecework.placeholders.moduleTitle', { title })}
                description={t('piecework.placeholders.moduleSubtitle')}
            />


            <div className='rounded-[24px] border border-dashed border-muted/50 h-96 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5'>
                <p className='text-xs font-black uppercase tracking-[0.3em] italic'>{t('piecework.placeholders.notAvailable', { title })}</p>
                <p className='text-[9px] uppercase tracking-widest mt-2'>{t('piecework.placeholders.underDevelopment')}</p>
            </div>
        </div>
    )
}

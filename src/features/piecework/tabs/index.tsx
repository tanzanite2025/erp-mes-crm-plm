'use client'

import { useState, useMemo } from 'react'
import { flexRender, getCoreRowModel, type ColumnDef, useReactTable } from '@tanstack/react-table'
import { Landmark, Plus, Edit, Trash2, Search, Box, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
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
            header: '工序名称 / PROCESS',
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
            header: '关联产品 SKU / PRODUCT',
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
            header: '计件单价 / PRICE',
            cell: ({ row }) => (
                <span className='font-mono font-black text-emerald-600 text-sm italic'>
                    ¥{row.original.piecePrice.toFixed(2)} / {row.original.unit}
                </span>
            )
        },
        {
            accessorKey: 'status',
            header: '状态 / STATUS',
            cell: ({ row }) => (
                <Badge 
                    variant='outline' 
                    className={cn(
                        'h-5 text-[9px] font-black uppercase tracking-widest rounded-full px-2',
                        row.original.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-none'
                    )}
                >
                    {row.original.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: '操作 / ACTIONS',
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

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
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
            {/* 工业感页眉 */}
            <div className='flex flex-col gap-2 bg-muted/5 p-8 rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent pointer-events-none' />
                <div className='flex items-center gap-2 text-emerald-600'>
                    <Landmark className='size-5' />
                    <h3 className='text-lg font-black tracking-tighter italic uppercase'>计件工价原子标准</h3>
                </div>
                <div className='flex items-center justify-between'>
                    <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                        PIECEWORK_RATE_HUB / 核心财务核算基准，所有规则变更均受 SDRTS 版本追踪与审计。
                    </p>
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10'>
                        <span className='text-[10px] font-black text-emerald-600/60 uppercase tracking-widest italic'>Audit_Active</span>
                        <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    </div>
                </div>
            </div>

            {/* 操作栏 */}
            <div className='flex items-center justify-between gap-4 bg-muted/5 p-8 rounded-[32px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
                <div className='relative w-96 group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors' />
                    <Input 
                        placeholder='搜索工序名、关联产品 SKU... RATIO_SCAN'
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className='pl-11 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-emerald-500/20'
                    />
                </div>
                <Button 
                    onClick={() => { setCurrentRow(null); setOpen(true); }} 
                    className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest gap-2 active:scale-95 transition-all'
                >
                    <Plus className='size-4' /> 新增工价标准
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
                                        SDRTS_SYNCING...
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
                                        NO_RATES_DEFINED
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
            <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
                <div className='flex items-center gap-2 text-primary'>
                    <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('piecework.placeholders.moduleTitle', { title })}</h3>
                </div>
                <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                    {t('piecework.placeholders.moduleSubtitle')}
                </p>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 h-96 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5'>
                <p className='text-xs font-black uppercase tracking-[0.3em] italic'>{t('piecework.placeholders.notAvailable', { title })}</p>
                <p className='text-[9px] uppercase tracking-widest mt-2'>{t('piecework.placeholders.underDevelopment')}</p>
            </div>
        </div>
    )
}

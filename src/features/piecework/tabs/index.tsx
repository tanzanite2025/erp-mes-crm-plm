'use client'

import { useState, useMemo } from 'react'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { Landmark, Plus, Edit, Trash2, Search, Box, Target } from 'lucide-react'
import type { DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { RateActionDialog } from '../components/rate-action-dialog'
import type { PieceworkRate } from '../data/schema'
import {
  useGetPieceworkRates,
  usePieceworkRateMutations,
} from '../hooks/use-piecework'

export function PieceworkQuery() {
  const { t } = useLanguage()
  return <Placeholder title={t('piecework.query.title')} />
}

export function PieceworkRules() {
  const { t } = useLanguage()
  const { level3Name } = useHierarchyLevelLabels()
  const { data: rates = [], isLoading } = useGetPieceworkRates()
  const { saveRateMutation, patchRateMutation, deleteRateMutation } =
    usePieceworkRateMutations()

  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<PieceworkRate | null>(null)

  const filteredData = useMemo(() => {
    return rates.filter(
      (item) =>
        item.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productId.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [rates, searchTerm])

  const columns: ColumnDef<PieceworkRate>[] = [
    {
      accessorKey: 'processName',
      header: t('piecework.rules.table.processName', { levelName: level3Name }),
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600'>
            <Target className='size-4' />
          </div>
          <span className='text-sm font-bold'>{row.original.processName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'productId',
      header: t('piecework.rules.table.productSku'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Box className='size-3 text-muted-foreground' />
          <span className='font-mono text-[11px] font-black tracking-tight text-muted-foreground uppercase'>
            {row.original.productId}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'piecePrice',
      header: t('piecework.rules.table.piecePrice'),
      cell: ({ row }) => (
        <span className='font-mono text-sm font-black text-emerald-600 italic'>
          ¥{row.original.piecePrice.toFixed(2)} / {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('piecework.rules.table.status'),
      cell: ({ row }) => (
        <Badge
          variant='outline'
          className={cn(
            'h-5 rounded-full px-2 text-[9px] font-black tracking-widest uppercase',
            row.original.status === 'active'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-none bg-muted text-muted-foreground'
          )}
        >
          {row.original.status === 'active'
            ? t('piecework.rules.status.active')
            : t('piecework.rules.status.inactive')}
        </Badge>
      ),
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
            onClick={() => {
              setCurrentRow(row.original)
              setOpen(true)
            }}
          >
            <Edit className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive/50 hover:bg-destructive/10 hover:text-destructive'
            onClick={() => deleteRateMutation.mutate(row.original.id)}
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data: filteredData,
    columns,
  })

  const handleSave = (params: {
    data: PieceworkRate
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    const { data: formData, isPatch, delta, version } = params
    if (isPatch && delta) {
      patchRateMutation.mutate(
        { id: formData.id, delta, version: version! },
        {
          onSuccess: () => setOpen(false),
        }
      )
    } else {
      saveRateMutation.mutate(formData, {
        onSuccess: () => setOpen(false),
      })
    }
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Landmark}
        title={t('piecework.rules.page.headerTitle')}
        description={t('piecework.rules.page.headerDescription', {
          levelName: level3Name,
        })}
        gradient
        innerClassName='text-emerald-600'
        className='border-muted-foreground/10'
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-emerald-600/60 uppercase italic'>
              {t('piecework.rules.page.statusBadge')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          </div>
        }
      />

      {/* 操作栏 */}
      <div className='flex items-center justify-between gap-4 overflow-hidden rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/5 p-8 shadow-inner'>
        <div className='group relative w-96'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-emerald-500' />
          <Input
            placeholder={t('piecework.rules.page.searchPlaceholder', {
              levelName: level3Name,
            })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-12 rounded-2xl border-none bg-background pl-11 text-sm font-medium shadow-inner focus-visible:ring-emerald-500/20'
          />
        </div>
        <Button
          onClick={() => {
            setCurrentRow(null)
            setOpen(true)
          }}
          className='h-11 gap-2 rounded-full bg-emerald-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95'
        >
          <Plus className='size-4' /> {t('piecework.rules.page.add')}
        </Button>
      </div>

      {/* 数据表格 */}
      <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='h-14 bg-muted/30'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='border-b border-dashed border-muted/50 hover:bg-transparent'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='px-8 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-64 text-center text-[10px] font-black tracking-widest uppercase italic antialiased opacity-20'
                  >
                    {t('piecework.rules.page.loading')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className='group h-16 border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-emerald-500/5'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='px-8'>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-64 text-center text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase italic antialiased'
                  >
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Landmark}
        title={t('piecework.placeholders.moduleTitle', { title })}
        description={t('piecework.placeholders.moduleSubtitle')}
      />

      <div className='flex h-96 flex-col items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5 text-muted-foreground/30'>
        <p className='text-xs font-black tracking-[0.3em] uppercase italic'>
          {t('piecework.placeholders.notAvailable', { title })}
        </p>
        <p className='mt-2 text-[9px] tracking-widest uppercase'>
          {t('piecework.placeholders.underDevelopment')}
        </p>
      </div>
    </div>
  )
}

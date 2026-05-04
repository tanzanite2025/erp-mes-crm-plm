import { useMemo } from 'react'
import {
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import type { DrillingPlan } from '../data/schema'
import { getEngineeringDbFileVisual } from '../view-helpers'
import type { DrillingRowViewModel } from '../hooks/use-drilling-page-state'

interface DrillingTableCardProps {
  rows: DrillingRowViewModel[]
  isLoading: boolean
  highlightId?: string
  onPreview: (item: DrillingPlan) => void
  onEdit: (item: DrillingPlan) => void
  onDelete: (item: DrillingPlan) => void
}

export function DrillingTableCard({
  rows,
  isLoading,
  highlightId,
  onPreview,
  onEdit,
  onDelete,
}: DrillingTableCardProps) {
  const { t } = useLanguage()

  const columns = useMemo<ColumnDef<DrillingRowViewModel>[]>(() => [
    {
      accessorKey: 'item.name',
      header: t('engineering.drilling.table.name'),
      cell: ({ row }) => {
        const fileVisual = getEngineeringDbFileVisual({ extension: row.original.item.fileExtension, category: 'DRILLING' })
        const Icon = fileVisual.icon
        return (
          <div className='flex items-center gap-3'>
            <div className={`size-10 rounded-lg border ${fileVisual.containerClassName} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
              <Icon className={`size-5 ${fileVisual.iconClassName}`} />
            </div>
            <div className='flex flex-col'>
              <span className='font-bold text-sm text-foreground'>{row.original.item.name}</span>
              <div className='flex items-center gap-2 mt-1'>
                <Badge variant='outline' className='text-[10px] h-4 px-1.5 py-0 bg-muted/50 text-muted-foreground uppercase font-mono font-bold border-none'>
                  {row.original.item.fileExtension || 'PDF'}
                </Badge>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      header: t('engineering.drilling.table.product'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='text-[12px] font-bold text-indigo-600 font-mono'>
            {row.original.productSku || 'UNKNOWN'}
          </span>
          <span className='text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]'>
            {row.original.productName || t('engineering.drilling.table.unlinked')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'item.weavingModeLabel',
      header: t('engineering.drilling.table.lacing'),
      cell: ({ row }) => (
        <Badge variant='outline' className='bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px] h-5'>
          {row.original.item.weavingModeLabel || '--'}
        </Badge>
      ),
    },
    {
      accessorKey: 'item.standardHoles',
      header: t('engineering.drilling.table.holes'),
      cell: ({ row }) => (
        <span className='font-bold text-sm text-foreground italic'>
          {row.original.item.standardHoles ? `${row.original.item.standardHoles}H` : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'item.createdAt',
      header: t('engineering.drilling.table.date'),
      cell: ({ row }) => (
        <span className='font-mono text-[11px] text-muted-foreground font-medium'>
          {row.original.item.createdAt ? new Date(row.original.item.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.drilling.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500' onClick={() => onPreview(row.original.item)}><Eye className='size-3.5' /></Button>
          <div onClick={(event) => event.stopPropagation()}>
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.drilling}
              targetId={row.original.item.id}
              targetName={row.original.item.name}
              iconOnly
              className='size-8 rounded-full px-0'
            />
          </div>
          <div className='w-px h-4 bg-border mx-1' />
          <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => onEdit(row.original.item)}><Edit className='size-3.5' /></Button>
          <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive hover:bg-destructive/10' onClick={() => onDelete(row.original.item)}><Trash2 className='size-3.5' /></Button>
        </div>
      ),
    },
  ], [onDelete, onEdit, onPreview, t])

  const table = useUdsClientTable({
    data: rows,
    columns,
  })

  return (
    <>
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
                    onClick={() => onPreview(row.original.item)}
                    className={cn(
                      'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-16 cursor-pointer',
                      row.original.item.id === highlightId && 'bg-primary/5 animate-pulse border-2 border-primary/20 shadow-inner',
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
                <TableRow><TableCell colSpan={columns.length} className='h-64 text-center text-muted-foreground/30'>{t('engineering.drilling.table.empty')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className='pt-2 hidden md:block'>
        <DataTablePagination table={table} />
      </div>
    </>
  )
}

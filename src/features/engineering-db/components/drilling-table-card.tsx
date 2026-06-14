import { useMemo } from 'react'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
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
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { DataTablePagination } from '@/components/data-table'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import type { DrillingPlan } from '../data/schema'
import type { DrillingRowViewModel } from '../hooks/use-drilling-page-state'
import { getEngineeringDbFileVisual } from '../view-helpers'

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

  const columns = useMemo<ColumnDef<DrillingRowViewModel>[]>(
    () => [
      {
        accessorKey: 'item.name',
        header: t('engineering.drilling.table.name'),
        cell: ({ row }) => {
          const fileVisual = getEngineeringDbFileVisual({
            extension: row.original.item.fileExtension,
            category: 'DRILLING',
          })
          const Icon = fileVisual.icon
          return (
            <div className='flex items-center gap-2.5'>
              <div
                className={`size-8 rounded-lg border ${fileVisual.containerClassName} flex shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-110`}
              >
                <Icon className={`size-4 ${fileVisual.iconClassName}`} />
              </div>
              <div className='flex flex-col'>
                <span className='text-sm font-bold text-foreground'>
                  {row.original.item.name}
                </span>
                <div className='mt-0.5 flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className='h-4 border-none bg-muted/50 px-1.5 py-0 font-mono text-[10px] font-bold text-muted-foreground uppercase'
                  >
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
            <span className='font-mono text-[12px] font-bold text-indigo-600'>
              {row.original.productSku || 'UNKNOWN'}
            </span>
            <span className='mt-0.5 max-w-[150px] truncate text-[10px] text-muted-foreground'>
              {row.original.productName ||
                t('engineering.drilling.table.unlinked')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'item.weavingModeLabel',
        header: t('engineering.drilling.table.lacing'),
        cell: ({ row }) => (
          <Badge
            variant='outline'
            className='h-5 border-indigo-200 bg-indigo-50 font-mono text-[10px] text-indigo-700'
          >
            {row.original.item.weavingModeLabel || '--'}
          </Badge>
        ),
      },
      {
        accessorKey: 'item.standardHoles',
        header: t('engineering.drilling.table.holes'),
        cell: ({ row }) => (
          <span className='text-sm font-bold text-foreground italic'>
            {row.original.item.standardHoles
              ? `${row.original.item.standardHoles}H`
              : '--'}
          </span>
        ),
      },
      {
        accessorKey: 'item.createdAt',
        header: t('engineering.drilling.table.date'),
        cell: ({ row }) => (
          <span className='font-mono text-[11px] font-medium text-muted-foreground'>
            {row.original.item.createdAt
              ? new Date(row.original.item.createdAt).toLocaleDateString()
              : 'N/A'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('engineering.drilling.table.actions'),
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500'
              onClick={() => onPreview(row.original.item)}
            >
              <Eye className='size-3.5' />
            </Button>
            <div onClick={(event) => event.stopPropagation()}>
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.drilling}
                targetId={row.original.item.id}
                targetName={row.original.item.name}
                iconOnly
                className='size-8 rounded-full px-0'
              />
            </div>
            <div className='mx-1 h-4 w-px bg-border' />
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-full'
              onClick={() => onEdit(row.original.item)}
            >
              <Edit className='size-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-full text-destructive hover:bg-destructive/10'
              onClick={() => onDelete(row.original.item)}
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit, onPreview, t]
  )

  const table = useUdsClientTable({
    data: rows,
    columns,
  })

  return (
    <>
      <Card className='hidden overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none md:block'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='h-11 bg-muted/30'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='border-b border-dashed border-muted/50 hover:bg-transparent'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='px-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
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
                    className='h-64 text-center'
                  >
                    {t('common.status.syncing')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onPreview(row.original.item)}
                    className={cn(
                      'group h-12 cursor-pointer border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5',
                      row.original.item.id === highlightId &&
                        'animate-pulse border-2 border-primary/20 bg-primary/5 shadow-inner'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='px-4'>
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
                    className='h-64 text-center text-muted-foreground/30'
                  >
                    {t('engineering.drilling.table.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className='hidden pt-2 md:block'>
        <DataTablePagination table={table} />
      </div>
    </>
  )
}

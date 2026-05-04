'use client'

import { useMemo } from 'react'
import {
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { ClipboardList, Edit, Eye, Layers, Trash2 } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { DataTablePagination } from '@/components/data-table'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
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
import { deriveBomDisplayVersion, normalizeBomChangeType, normalizeBomStatus, normalizeEngineeringDateProtocol } from '@/lib/codecs/code-normalization'
import { cn } from '@/lib/utils'
import { type BOM, type Product } from '../../data/schema'
import { getProductAttributes } from '../../utils/product-utils'

interface BOMTableProps {
  data: BOM[]
  products: Product[]
  isLoading: boolean
  onPreview: (bom: BOM) => void
  onEdit: (bom: BOM) => void
  onDelete: (id: string) => void
}

export function BOMTable({
  data,
  products,
  isLoading,
  onPreview,
  onEdit,
  onDelete,
}: BOMTableProps) {
  const { t } = useLanguage()
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  const columns: ColumnDef<BOM>[] = [
    {
      accessorKey: 'bomNo',
      header: t('engineering.bomArchive.table.bom'),
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-md border bg-slate-50'>
            <ClipboardList className='size-5 text-blue-500' />
          </div>
          <div className='flex flex-col'>
            <span className='font-mono font-bold leading-tight'>{row.original.bomNo}</span>
            <div className='mt-0.5 flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='h-4 border-blue-200 bg-blue-50 px-1 py-0 text-[10px] text-blue-600'>
                {deriveBomDisplayVersion(row.original.bomVersion || row.original.bomDisplayVersion)}
              </Badge>
              {row.original.revisionNo && (
                <Badge variant='outline' className='h-4 border-amber-200 bg-amber-50 px-1 py-0 text-[10px] text-amber-700'>
                  {row.original.revisionNo}
                </Badge>
              )}
              {row.original.siteCode && (
                <Badge variant='outline' className='h-4 border-slate-200 bg-slate-50 px-1 py-0 text-[10px] text-slate-600'>
                  {row.original.siteCode}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: t('engineering.bomArchive.table.product'),
      cell: ({ row }) => {
        const product = row.original.product || productMap.get(row.original.productId)
        if (!product) {
          return <span className='italic text-muted-foreground'>{t('engineering.bomArchive.table.unknownProduct')}</span>
        }

        const productView = getProductAttributes(product)

        return (
          <div className='flex flex-col gap-1 py-1'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-bold leading-tight text-slate-800'>{productView.name}</span>
              <Badge className='h-4 border-indigo-100 bg-indigo-50 px-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50'>
                {productView.version}
              </Badge>
            </div>
            <div className='flex items-center gap-1.5'>
              <Badge variant='outline' className='h-3.5 border-slate-200 bg-slate-50 px-1 text-[9px] font-normal text-slate-500'>
                {productView.series}
              </Badge>
              <Badge variant='outline' className='h-3.5 border-slate-200 bg-slate-50 px-1 text-[9px] font-normal text-slate-500'>
                {productView.brake}
              </Badge>
              <span className='ml-1 text-[10px] text-muted-foreground'>{productView.weight}</span>
            </div>
            <span className='font-mono text-[10px] text-muted-foreground/60'>{productView.sku}</span>
          </div>
        )
      },
    },
    {
      header: t('engineering.bomArchive.table.structure'),
      cell: ({ row }) => {
        const sections = Array.from(new Set(row.original.items.map((item) => item.section).filter(Boolean)))
        const substituteCount = row.original.items.reduce(
          (sum, item) => sum + (item.substitutes?.length || 0),
          0
        )

        return (
          <div className='flex max-w-[240px] flex-wrap items-center gap-1.5'>
            {sections.length > 0 ? (
              sections.map((section) => (
                <Badge key={section} variant='outline' className='h-4 border-slate-200 bg-slate-50 px-1 py-0 text-[10px] text-slate-500'>
                  {section}
                </Badge>
              ))
            ) : (
              <span className='text-xs italic text-muted-foreground'>{t('engineering.bomArchive.table.noSection')}</span>
            )}
            <span className='text-[10px] text-muted-foreground'>
              {t('engineering.bomArchive.table.lines', { count: row.original.items.length })}
            </span>
            {substituteCount > 0 && (
              <Badge variant='outline' className='h-4 border-emerald-200 bg-emerald-50 px-1 py-0 text-[10px] text-emerald-700'>
                {t('engineering.bomArchive.table.substitutes', { count: substituteCount })}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      header: t('engineering.bomArchive.table.change'),
      cell: ({ row }) => {
        const changeType = normalizeBomChangeType(row.original.changeType)
        const effectiveFrom = normalizeEngineeringDateProtocol(row.original.effectiveFrom)

        return (
          <div className='flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide'>
            <span className='text-slate-700'>{changeType || t('engineering.bomArchive.form.manual')}</span>
            <span className='font-mono text-muted-foreground'>{row.original.changeOrderNo || '-'}</span>
            <span className='text-muted-foreground'>
              {effectiveFrom
                ? t('engineering.bomArchive.table.fromDate', { date: effectiveFrom })
                : t('engineering.bomArchive.table.noEffectiveDate')}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: t('engineering.bomArchive.table.status'),
      cell: ({ row }) => {
        const status = normalizeBomStatus(row.original.status)
        const config = {
          draft: {
            label: t('engineering.bomArchive.status.draft'),
            className: 'bg-slate-500/10 text-slate-600 border-slate-200',
          },
          active: {
            label: t('engineering.bomArchive.status.active'),
            className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
          },
          archived: {
            label: t('engineering.bomArchive.status.archived'),
            className: 'bg-rose-500/10 text-rose-600 border-rose-200',
          },
        }

        const current = config[status as keyof typeof config] || config.draft

        return (
          <Badge variant='outline' className={cn('h-5 rounded-md border-none px-2 py-0 text-[9px] font-black uppercase tracking-widest', current.className)}>
            {current.label}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: t('engineering.bomArchive.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.bom}
            targetId={row.original.id}
            targetName={row.original.bomNo}
            iconOnly
            className='size-8 rounded-full border-none bg-muted/40 text-foreground hover:bg-muted'
          />
          <Button variant='ghost' size='icon' className='size-8 rounded-full text-blue-600 hover:bg-blue-50' onClick={() => onPreview(row.original)}>
            <Eye className='size-4' />
          </Button>
          <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-muted' onClick={() => onEdit(row.original)}>
            <Edit className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive hover:bg-rose-50'
            onClick={() => {
              if (window.confirm(t('engineering.bomArchive.table.confirmDelete'))) {
                onDelete(row.original.id)
              }
            }}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data,
    columns,
  })

  return (
    <div className='space-y-4'>
      <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/3 shadow-inner'>
        <CardContent className='overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/10 p-0'>
          <div className='min-w-[980px]'>
            <Table>
              <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className='border-none hover:bg-transparent'>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className='h-12 py-0 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className='animate-pulse'>
                      <TableCell colSpan={columns.length} className='py-4'>
                        <div className='h-12 rounded-xl bg-muted/50' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className='transition-colors hover:bg-slate-50/30'>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='py-3'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-48 text-center sm:h-64'>
                      <div className='flex flex-col items-center justify-center gap-3 opacity-40'>
                        <Layers className='size-10 text-muted-foreground stroke-1 sm:size-12' />
                        <p className='px-8 text-[10px] font-semibold uppercase tracking-widest italic sm:text-sm'>
                          {t('engineering.bomArchive.table.empty')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DataTablePagination table={table} />
    </div>
  )
}

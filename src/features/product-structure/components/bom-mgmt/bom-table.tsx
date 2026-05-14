'use client'

import { useMemo } from 'react'
import {
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { ClipboardList, Edit, Eye, Layers, RefreshCw, Trash2, Zap } from 'lucide-react'
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
import { normalizeBomChangeType, normalizeBomStatus, normalizeEngineeringDateProtocol } from '@/lib/codecs/code-normalization'
import { cn } from '@/lib/utils'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM, type Product, type BOMItem } from '../../data/schema'
import { isEBOM, isMBOM } from '../../utils/bom-identity'
import { selectBOMDisplayVersion } from '../../utils/bom-display-version'
import { resolveBOMProductDisplaySummary } from '../../utils/bom-product-display'
import { resolveBOMSectionLabel } from '../../utils/bom-section-utils'

interface BOMTableProps {
  data: BOM[]
  products: Product[]
  sections: BOMSectionOption[]
  isLoading: boolean
  onPreview: (bom: BOM) => void
  onEdit: (bom: BOM) => void
  onDerive: (bom: BOM) => void
  onRevise: (bom: BOM) => void
  onDelete: (id: string) => void
}

export function BOMTable({
  data,
  products,
  sections,
  isLoading,
  onPreview,
  onEdit,
  onDerive,
  onRevise,
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
      cell: ({ row }) => {
        const bomType = row.original.bomType || 'EBOM'
        const isMfg = isMBOM(row.original)

        return (
          <div className='flex items-center gap-3'>
            <div className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md border',
              isMfg ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
            )}>
              <ClipboardList className={cn('size-5', isMfg ? 'text-indigo-500' : 'text-blue-500')} />
            </div>
            <div className='flex flex-col'>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-bold leading-tight'>{row.original.bomNo}</span>
                <Badge 
                  variant='outline' 
                  className={cn(
                    'h-3.5 px-1 text-[8px] font-black tracking-widest uppercase border-none',
                    isMfg ? 'bg-indigo-500/10 text-indigo-600' : 'bg-blue-500/10 text-blue-600'
                  )}
                >
                  {t(`engineering.dict.${bomType}` as any)}
                </Badge>
              </div>
              <div className='mt-0.5 flex flex-wrap items-center gap-2'>
                <Badge variant='outline' className='h-4 border-blue-200 bg-blue-50 px-1 py-0 text-[10px] text-blue-600'>
                  {selectBOMDisplayVersion(row.original)}
                </Badge>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      header: t('engineering.bomArchive.table.product'),
      cell: ({ row }) => {
        const product = row.original.product || productMap.get(row.original.productId)
        if (!product) {
          return <span className='italic text-muted-foreground'>{t('engineering.bomArchive.table.unknownProduct')}</span>
        }

        const summary = resolveBOMProductDisplaySummary(product)

        return (
          <div className='flex flex-col gap-1 py-1'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-bold leading-tight text-slate-800'>{product.name}</span>
              <Badge className='h-4 border-indigo-100 bg-indigo-50 px-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50'>
                {summary.version}
              </Badge>
            </div>
            <div className='flex items-center gap-1.5'>
              <Badge variant='outline' className='h-3.5 border-slate-200 bg-slate-50 px-1 text-[9px] font-normal text-slate-500'>
                {summary.series}
              </Badge>
              <Badge variant='outline' className='h-3.5 border-slate-200 bg-slate-50 px-1 text-[9px] font-normal text-slate-500'>
                {summary.brake}
              </Badge>
              <span className='ml-1 text-[10px] text-muted-foreground'>{summary.weightLabel}</span>
            </div>
            <span className='font-mono text-[10px] text-muted-foreground/60'>{product.sku}</span>
          </div>
        )
      },
    },
    {
      header: t('engineering.bomArchive.table.structure'),
      cell: ({ row }) => {
        const sectionLabels = Array.from(
          new Set<string>(
            row.original.items
              .map((item: BOMItem) => resolveBOMSectionLabel(sections, item.section, item.section || ''))
              .filter((label): label is string => Boolean(label))
          )
        )

        return (
          <div className='flex max-w-[240px] flex-wrap items-center gap-1.5'>
            {sectionLabels.length > 0 ? (
              sectionLabels.map((section: string) => (
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
        const config: Record<string, { label: string; className: string }> = {
          draft: {
            label: t('engineering.bomArchive.status.draft'),
            className: 'bg-slate-500/10 text-slate-600 border-slate-200',
          },
          active: {
            label: t('engineering.bomArchive.status.active'),
            className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
          },
          reviewing: {
            label: t('engineering.bomArchive.status.reviewing'),
            className: 'bg-amber-500/10 text-amber-600 border-amber-200',
          },
          approved: {
            label: t('engineering.bomArchive.status.approved'),
            className: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
          },
          released: {
            label: t('engineering.bomArchive.status.released'),
            className: 'bg-emerald-500/20 text-emerald-700 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse',
          },
          archived: {
            label: t('engineering.bomArchive.status.archived'),
            className: 'bg-rose-500/10 text-rose-600 border-rose-200',
          },
          obsolete: {
            label: t('engineering.bomArchive.status.obsolete'),
            className: 'bg-zinc-500/10 text-zinc-600 border-zinc-200 grayscale',
          },
        }

        const current = config[status] || config.draft

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
      cell: ({ row }) => {
        const isLocked = row.original.isLocked
        const canDerive = isEBOM(row.original) && !isLocked
        const canRevise = isMBOM(row.original) && row.original.status === 'RELEASED'

        return (
          <div className='flex items-center gap-1'>
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.bom}
              targetId={row.original.id}
              targetName={row.original.bomNo}
              iconOnly
              className='size-8 rounded-full border-none bg-muted/40 text-foreground hover:bg-muted'
            />
            <Button 
              variant='ghost' 
              size='icon' 
              className='size-8 rounded-full text-blue-600 hover:bg-blue-50' 
              onClick={() => onPreview(row.original)}
              title={t('common.actions.preview')}
            >
              <Eye className='size-4' />
            </Button>
            
            {canDerive && (
              <Button 
                variant='ghost' 
                size='icon' 
                className='size-8 rounded-full text-amber-600 hover:bg-amber-50' 
                onClick={() => onDerive(row.original)}
                title={t('engineering.bomArchive.actions.derive')}
              >
                <Zap className='size-4' />
              </Button>
            )}

            {isMBOM(row.original) && (
              <Button
                variant='ghost'
                size='icon'
                disabled={!canRevise}
                className={cn(
                  'size-8 rounded-full transition-all duration-300',
                  canRevise
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-muted-foreground/30'
                )}
                onClick={() => {
                  if (canRevise) onRevise(row.original)
                }}
                title={
                  canRevise
                    ? '提交修订（产生新版本）'
                    : '仅生效中（RELEASED）的生产 BOM 可以修订'
                }
              >
                <RefreshCw className='size-4' />
              </Button>
            )}

            <Button 
              variant='ghost' 
              size='icon' 
              className='size-8 rounded-full hover:bg-muted' 
              onClick={() => onEdit(row.original)}
              title={t('common.actions.edit')}
            >
              <Edit className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              disabled={isLocked}
              className={cn('size-8 rounded-full transition-all duration-300', isLocked ? 'text-muted-foreground/30' : 'text-destructive hover:bg-rose-50')}
              onClick={() => {
                if (window.confirm(t('engineering.bomArchive.table.confirmDelete'))) {
                  onDelete(row.original.id)
                }
              }}
              title={t('common.actions.delete')}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        )
      },
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

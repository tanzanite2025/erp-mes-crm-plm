'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type ColumnDef, flexRender } from '@tanstack/react-table'
import { Search, FileText, Eye, ArrowUpRight, Hash, Clock } from 'lucide-react'
import { toast } from 'sonner'
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
import { DataTablePagination } from '@/components/data-table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CADViewerDialog } from '../components/cad-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import {
  type UnifiedEntry,
  useEngineeringDbOverview,
} from '../hooks/use-engineering-db-overview'
import { FileResolverService } from '../services/file-resolver-service'
import {
  getEngineeringDbCategoryBadgeClass,
  getEngineeringDbCategoryLabel,
  getEngineeringDbFileVisual,
  getEngineeringDbPreviewKind,
  getEngineeringDbSubtypeLabel,
  normalizeEngineeringDbFileExtension,
} from '../view-helpers'

export function OverviewTab() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const {
    data,
    filteredData,
    productMap,
    stats,
    isLoading: loading,
  } = useEngineeringDbOverview(searchTerm)

  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    sku?: string
  } | null>(null)
  const [cadPreviewOpen, setCadPreviewOpen] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewFile?.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile?.url])
  const statCards = useMemo(
    () => [
      {
        label: t('engineering.db.stats.technicalSpecs'),
        count: stats.specCount,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
      },
      {
        label: t('engineering.db.stats.drillingPlans'),
        count: stats.drillingCount,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
      },
      {
        label: '裁砂方案',
        count: stats.cuttingCount,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
      },
      {
        label: t('engineering.db.stats.labelingDrafts'),
        count: stats.labelingCount,
        color: 'text-teal-500',
        bg: 'bg-teal-500/10',
      },
      {
        label: t('engineering.db.stats.excelSheets'),
        count: stats.excelCount,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
      },
      {
        label: t('engineering.db.stats.cadDrawings'),
        count: stats.cadCount,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
      },
    ],
    [stats, t]
  )

  const resolveCategoryRoute = (category: UnifiedEntry['category']) => {
    switch (category) {
      case 'SPEC':
        return '/engineering-db/specs'
      case 'DRILLING':
        return '/engineering-db/drilling'
      case 'CUTTING':
        return '/raw-materials/cutting-plan'
      case 'LABELING':
        return '/engineering-db/labeling'
    }
  }

  const handlePreview = async (item: UnifiedEntry) => {
    if (item.fileUrl) {
      const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
      if (!resolvedUrl) {
        toast.error(t('engineering.db.status.unResolved'))
        return
      }
      const product = productMap.get(item.relationId || '')
      setPreviewFile({
        url: resolvedUrl,
        name: item.name,
        sku: product?.sku,
      })

      const previewKind = getEngineeringDbPreviewKind(item.fileExtension)
      if (previewKind === 'excel') {
        setExcelPreviewOpen(true)
      } else if (previewKind === 'cad') {
        setCadPreviewOpen(true)
      } else {
        setPdfPreviewOpen(true)
      }
    } else {
      toast.error(t('engineering.db.status.noAttachment'))
    }
  }

  const columns: ColumnDef<UnifiedEntry>[] = [
    {
      accessorKey: 'name',
      header: t('engineering.db.table.topic'),
      cell: ({ row }) => {
        const item = row.original
        const ext = normalizeEngineeringDbFileExtension(item.fileExtension)
        const fileVisual = getEngineeringDbFileVisual({
          extension: item.fileExtension,
          category: item.category,
        })
        const Icon = fileVisual.icon

        return (
          <div className='flex items-center gap-2.5'>
            <div
              className={`size-8 rounded-lg border ${fileVisual.containerClassName} flex shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-105`}
            >
              <Icon className={`size-4 ${fileVisual.iconClassName}`} />
            </div>
            <div className='flex flex-col'>
              <span className='text-sm font-bold text-foreground transition-colors group-hover:text-primary'>
                {item.name}
              </span>
              <div className='mt-0.5 flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='h-3.5 border-none bg-muted/50 px-1 text-[9px] font-black uppercase'
                >
                  {ext || t('engineering.db.table.na')}
                </Badge>
                <span className='text-[10px] text-muted-foreground/50'>•</span>
                <span className='font-mono text-[10px] text-muted-foreground'>
                  {item.id}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      header: t('engineering.db.table.category'),
      cell: ({ row }) => {
        const categoryLabel = getEngineeringDbCategoryLabel(
          t,
          row.original.category
        )
        const colorClass = getEngineeringDbCategoryBadgeClass(
          row.original.category
        )
        const subTypeLabel = getEngineeringDbSubtypeLabel(
          t,
          row.original.subType
        )
        return (
          <div className='flex flex-col gap-1'>
            <span
              className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-black tracking-tighter uppercase ${colorClass}`}
            >
              {categoryLabel}
            </span>
            <span className='ml-1 text-[11px] font-medium text-muted-foreground'>
              {subTypeLabel}
            </span>
          </div>
        )
      },
    },
    {
      header: t('engineering.db.table.relation'),
      cell: ({ row }) => {
        const product = productMap.get(row.original.relationId || '')
        if (!row.original.relationId)
          return (
            <span className='text-[11px] text-muted-foreground/30 italic'>
              {t('engineering.db.table.global')}
            </span>
          )
        return (
          <div className='flex flex-col'>
            <span className='font-mono text-[11px] font-black text-muted-foreground uppercase'>
              {product?.sku || 'UNKNOWN'}
            </span>
            <span className='max-w-[120px] truncate text-[10px] text-muted-foreground'>
              {product?.name || t('engineering.db.table.orphan')}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('engineering.db.table.lastUpdate'),
      cell: ({ row }) => (
        <span className='text-[11px] font-medium text-muted-foreground'>
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString()
            : t('engineering.db.table.na')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.db.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full transition-colors hover:bg-primary/10'
            onClick={() => handlePreview(row.original)}
          >
            <Eye className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-violet-500/10 hover:text-violet-500'
            onClick={() => {
              navigate({
                to: resolveCategoryRoute(row.original.category),
                search: { highlightId: row.original.id },
              })
            }}
          >
            <ArrowUpRight className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data: filteredData,
    columns,
  })

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      {/* 响应式工业页眉 */}
      <IndustrialHeader
        icon={FileText}
        title={t('engineering.db.overview.title')}
        description={t('engineering.db.overview.description')}
        gradient
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-primary/10 bg-primary/5 px-3 py-1'>
            <span className='text-[9px] font-black tracking-widest text-primary/60 uppercase'>
              {t('engineering.db.status.syncReady')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-primary' />
          </div>
        }
      />

      {/* 功能栏与统计 - 响应式栅格 */}
      <div className='flex flex-col gap-3.5 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-3 px-4 shadow-inner'>
        <div className='flex flex-col items-center justify-between gap-3 lg:flex-row'>
          <div className='group relative w-full lg:max-w-md'>
            <Search className='absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('engineering.db.overview.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='h-10 w-full rounded-xl border-none bg-background pl-9 text-sm font-bold shadow-inner placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>
          <div className='flex items-center gap-2 self-end lg:self-auto'>
            <div className='flex min-w-[80px] flex-col items-center justify-center rounded-xl border border-dashed border-muted/50 bg-background px-3.5 py-1.5'>
              <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.db.stats.total')}
              </span>
              <span className='text-sm font-black text-primary italic'>
                {data.length}
              </span>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6'>
          {statCards.map((stat, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between gap-1.5 ${stat.bg} cursor-default rounded-[16px] border border-white/5 px-3 py-2.5 shadow-sm transition-all hover:scale-[1.02]`}
            >
              <span
                className={`text-[9px] font-black tracking-widest uppercase opacity-60 ${stat.color} truncate whitespace-nowrap`}
              >
                {stat.label}
              </span>
              <div className='shrink-0 text-base font-black tracking-tighter italic tabular-nums'>
                {stat.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 列表区域 - Desktop Table */}
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
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-64 text-center'
                  >
                    {t('engineering.db.status.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredData.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className='group h-12 cursor-pointer border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5'
                    onClick={() => handlePreview(row.original)}
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
                    className='h-64 text-center text-muted-foreground/30 italic'
                  >
                    {t('engineering.db.status.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 列表区域 - Mobile Card View */}
      <div className='flex flex-col gap-4 md:hidden'>
        {loading ? (
          <div className='animate-pulse p-12 text-center text-[10px] font-black text-muted-foreground uppercase italic'>
            {t('engineering.db.status.aggregating')}
          </div>
        ) : filteredData.length === 0 ? (
          <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-12 text-center text-[10px] text-muted-foreground uppercase italic opacity-40'>
            {t('engineering.db.status.noData')}
          </div>
        ) : (
          filteredData.map((item) => {
            const product = productMap.get(item.relationId || '')
            const fileVisual = getEngineeringDbFileVisual({
              extension: item.fileExtension,
              category: item.category,
            })
            const Icon = fileVisual.icon
            const mobileCategoryLabel = getEngineeringDbCategoryLabel(
              t,
              item.category
            )
            const mobileSubTypeLabel = getEngineeringDbSubtypeLabel(
              t,
              item.subType
            )

            return (
              <div
                key={item.id}
                onClick={() => handlePreview(item)}
                className='group relative overflow-hidden rounded-[28px] border border-dashed border-muted/50 bg-background/50 p-5 transition-all active:scale-[0.98]'
              >
                <div className={`absolute top-0 right-0 p-4 opacity-20`}>
                  <Icon className={`size-12 ${fileVisual.iconClassName}`} />
                </div>

                <div className='flex flex-col gap-4'>
                  <div className='flex items-center justify-between'>
                    <div
                      className={`size-8 rounded-lg border ${fileVisual.containerClassName} flex items-center justify-center`}
                    >
                      <Icon className={`size-4 ${fileVisual.iconClassName}`} />
                    </div>
                    {product?.sku && (
                      <Badge
                        variant='outline'
                        className='h-5 rounded-full border-none bg-primary/5 px-3 font-mono text-[10px] leading-none font-black text-primary italic'
                      >
                        {product.sku}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className='text-sm leading-tight font-black tracking-tight transition-colors group-hover:text-primary'>
                      {item.name}
                    </h4>
                    <div className='mt-1.5 flex items-center gap-2'>
                      <span className='text-[10px] font-black tracking-tighter text-muted-foreground/60 uppercase italic'>
                        {mobileCategoryLabel}
                      </span>
                      <div className='size-1 rounded-full bg-muted-foreground/20' />
                      <span className='text-[10px] font-bold text-muted-foreground opacity-50'>
                        {mobileSubTypeLabel}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center justify-between border-t border-dashed border-muted/50 pt-2'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center gap-1.5'>
                        <Hash className='size-3 text-muted-foreground/30' />
                        <span className='font-mono text-[9px] text-muted-foreground/60 uppercase'>
                          {item.id}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <Clock className='size-3 text-muted-foreground/20' />
                        <span className='text-[9px] font-medium text-muted-foreground/40 italic'>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full hover:bg-violet-500/10 hover:text-violet-500'
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate({
                            to: resolveCategoryRoute(item.category),
                            search: { highlightId: item.id },
                          })
                        }}
                      >
                        <ArrowUpRight className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <CADViewerDialog
        open={cadPreviewOpen}
        onOpenChange={setCadPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
      <PDFViewerDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
      <ExcelViewerDialog
        open={excelPreviewOpen}
        onOpenChange={setExcelPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
    </div>
  )
}

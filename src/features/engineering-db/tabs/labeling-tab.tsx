'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Sticker,
  Eye,
  Hash,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
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
import { LabelingActionDialog } from '../components/labeling-action-dialog'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { type LabelingDraft, type LabelingDraftInput } from '../data/schema'
import { useEngineeringDbProductLookup } from '../hooks/use-engineering-db-product-lookup'
import { ENGINEERING_DB_LABELING_QUERY_KEY } from '../query-keys'
import { FileResolverService } from '../services/file-resolver-service'
import { ProductionDBService } from '../services/production-db-service'
import {
  getEngineeringDbFileVisual,
  getEngineeringDbLabelingTypeLabel,
  getEngineeringDbLabelingTypeVisual,
  getEngineeringDbPreviewKind,
} from '../view-helpers'

type LabelingRowViewModel = {
  item: LabelingDraft
  productSku: string | null
  productName: string | null
  typeLabel: string
  searchText: string
}

export function LabelingTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-db/labeling',
  })
  const { productMap } = useEngineeringDbProductLookup()
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<LabelingDraft | undefined>(
    undefined
  )

  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    sku?: string
  } | null>(null)
  const [cadPreviewOpen, setCadPreviewOpen] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: LabelingDraftInput
      recordId?: string
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      const { data: formData, recordId, isPatch, delta, version } = params
      if (isPatch && delta && recordId) {
        await ProductionDBService.patchLabeling(recordId, delta, version!)
        return
      }
      await ProductionDBService.saveLabelingItem(formData)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
      })
      setOpen(false)
      setCurrentRow(undefined)
      toast.success(
        variables.isPatch
          ? t('engineering.labeling.toasts.updateSuccess')
          : t('engineering.labeling.toasts.saveSuccess')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ProductionDBService.deleteLabeling(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
      })
      toast.success(t('engineering.labeling.toasts.deleteSuccess'))
    },
  })

  useEffect(() => {
    return () => {
      if (previewFile?.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile?.url])

  const filteredData = useMemo(() => {
    const rows = data.map<LabelingRowViewModel>((item) => {
      const product = productMap.get(item.productId || '')
      const typeLabel = getEngineeringDbLabelingTypeLabel(t, item.type)

      return {
        item,
        productSku: product?.sku || null,
        productName: product?.name || null,
        typeLabel,
        searchText: [
          item.name,
          product?.sku || '',
          product?.name || '',
          item.type,
          typeLabel,
        ]
          .join(' ')
          .toLowerCase(),
      }
    })

    const searchStr = searchTerm.trim().toLowerCase()
    if (!searchStr) {
      return rows
    }

    return rows.filter((row) => row.searchText.includes(searchStr))
  }, [data, productMap, searchTerm, t])

  const handlePreview = async (item: LabelingDraft) => {
    if (!item.fileUrl) {
      toast.error(t('engineering.labeling.toasts.noFile'))
      return
    }

    const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
    if (!resolvedUrl) {
      toast.error(t('engineering.labeling.toasts.unResolved'))
      return
    }

    const product = productMap.get(item.productId || '')
    setPreviewFile({
      url: resolvedUrl,
      name: item.name,
      sku: product?.sku,
    })

    const previewKind = getEngineeringDbPreviewKind(item.fileExtension)
    if (previewKind === 'cad') {
      setCadPreviewOpen(true)
    } else if (previewKind === 'excel') {
      setExcelPreviewOpen(true)
    } else {
      setPdfPreviewOpen(true)
    }
  }

  const columns: ColumnDef<LabelingRowViewModel>[] = [
    {
      accessorKey: 'item.name',
      header: t('engineering.labeling.table.name'),
      cell: ({ row }) => {
        const fileVisual = getEngineeringDbFileVisual({
          extension: row.original.item.fileExtension,
          category: 'LABELING',
        })
        const typeVisual = getEngineeringDbLabelingTypeVisual(
          row.original.item.type
        )
        const Icon = fileVisual.icon
        return (
          <div className='flex items-center gap-2.5'>
            <div
              className={`size-8 rounded-lg border ${typeVisual.className} flex shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-110`}
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
                <span className='text-[10px] font-medium text-muted-foreground/60 uppercase'>
                  {row.original.typeLabel}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      header: t('engineering.labeling.table.product'),
      cell: ({ row }) => {
        if (!row.original.item.productId) {
          return (
            <span className='rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-black text-muted-foreground/40 uppercase italic'>
              {t('engineering.labeling.table.generic')}
            </span>
          )
        }
        return (
          <div className='flex flex-col'>
            <span className='font-mono text-[12px] font-bold text-teal-600'>
              {row.original.productSku || 'UNKNOWN'}
            </span>
            <span className='mt-0.5 max-w-[150px] truncate text-[10px] text-muted-foreground'>
              {row.original.productName ||
                t('engineering.labeling.table.unlinked')}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'item.createdAt',
      header: t('engineering.labeling.table.date'),
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
      header: t('engineering.labeling.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-teal-500/10 hover:text-teal-500'
            onClick={() => handlePreview(row.original.item)}
          >
            <Eye className='size-3.5' />
          </Button>
          <div className='mx-1 h-4 w-px bg-border' />
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => {
              setCurrentRow(row.original.item)
              setOpen(true)
            }}
          >
            <Edit className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive hover:bg-destructive/10'
            onClick={() =>
              runConfirmedAction({
                confirmKey: 'engineering.labeling.toasts.deleteConfirm',
                onAction: async () => {
                  await deleteMutation.mutateAsync(row.original.item.id)
                },
              })
            }
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

  const handleSave = async (params: {
    data: LabelingDraftInput
    recordId?: string
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    await saveMutation.mutateAsync(params)
  }

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <IndustrialHeader
        icon={Sticker}
        title={t('engineering.labeling.overview.title')}
        description={t('engineering.labeling.overview.description')}
        gradient
        innerClassName='text-teal-600'
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-teal-500/10 bg-teal-500/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-teal-600/60 uppercase'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-teal-600' />
          </div>
        }
        className='border-muted-foreground/10'
      />

      <div className='flex flex-col items-center justify-between gap-3 overflow-hidden rounded-[24px] border border-dashed border-muted-foreground/10 bg-muted/5 p-3 px-4 shadow-inner sm:flex-row'>
        <div className='group relative w-full sm:w-80'>
          <Search className='absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-teal-600' />
          <Input
            placeholder={t('engineering.labeling.placeholders.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-10 w-full rounded-xl border-none bg-background pl-9 text-sm font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-teal-500/20'
          />
        </div>
        <Button
          onClick={() => {
            setCurrentRow(undefined)
            setOpen(true)
          }}
          className='h-10 w-full gap-1.5 rounded-full bg-teal-600 px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-teal-600/20 transition-all hover:bg-teal-700 active:scale-95 sm:w-auto'
        >
          <Plus className='size-3.5' /> {t('engineering.labeling.table.upload')}
        </Button>
      </div>

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
                    onClick={() => handlePreview(row.original.item)}
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
                    {t('engineering.labeling.table.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className='flex flex-col gap-4 md:hidden'>
        {isLoading ? (
          <div className='animate-pulse p-12 text-center text-[10px] font-black text-muted-foreground uppercase italic'>
            {t('engineering.labeling.placeholders.mobileLoading')}
          </div>
        ) : filteredData.length === 0 ? (
          <div className='rounded-[28px] border border-dashed border-muted-foreground/50 bg-muted/5 p-12 text-center text-[10px] text-muted-foreground uppercase italic opacity-40'>
            {t('engineering.labeling.placeholders.noData')}
          </div>
        ) : (
          filteredData.map((row) => {
            const item = row.item
            const fileVisual = getEngineeringDbFileVisual({
              extension: item.fileExtension,
              category: 'LABELING',
            })
            const typeVisual = getEngineeringDbLabelingTypeVisual(item.type)
            const Icon = fileVisual.icon
            const TypeIcon = typeVisual.icon
            return (
              <div
                key={item.id}
                onClick={() => handlePreview(item)}
                className={cn(
                  'group relative overflow-hidden rounded-[28px] border border-dashed border-muted/50 bg-background/50 p-5 transition-all active:scale-[0.98]',
                  item.id === highlightId &&
                    'animate-pulse bg-teal-500/5 ring-2 ring-teal-500/20'
                )}
              >
                <div className='absolute top-0 right-0 p-4 opacity-10'>
                  <Icon className={cn('size-16', fileVisual.iconClassName)} />
                </div>

                <div className='flex flex-col gap-4'>
                  <div className='flex items-center justify-between'>
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                        typeVisual.className
                      )}
                    >
                      <Icon
                        className={cn('size-5', fileVisual.iconClassName)}
                      />
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'h-5 rounded-full border-none px-3 font-mono text-[10px] leading-none font-black italic',
                        row.productSku
                          ? 'bg-teal-500/10 text-teal-600'
                          : 'bg-muted/50 text-muted-foreground/60'
                      )}
                    >
                      {row.productSku ||
                        t('engineering.labeling.table.generic')}
                    </Badge>
                  </div>

                  <div>
                    <h4 className='line-clamp-2 text-sm leading-tight font-black tracking-tight transition-colors group-active:text-teal-600'>
                      {item.name}
                    </h4>
                    <div className='mt-3 flex flex-wrap items-center gap-2 font-black tracking-widest uppercase'>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px]',
                          typeVisual.className
                        )}
                      >
                        <TypeIcon className='size-3 opacity-40' />
                        {row.typeLabel}
                      </div>
                      <div className='size-1 rounded-full bg-muted-foreground/20' />
                      <div className='flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 italic'>
                        <Hash className='size-2.5 opacity-30' />
                        {item.id.substring(0, 6)}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between border-t border-dashed border-muted-foreground/10 pt-3'>
                    <div className='flex items-center gap-2 text-[9px] font-medium text-muted-foreground/40 italic'>
                      <Calendar className='size-3 opacity-30' />
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500'
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(item)
                        }}
                      >
                        <Eye className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full'
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentRow(item)
                          setOpen(true)
                        }}
                      >
                        <Edit className='size-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full text-destructive/40'
                        onClick={(e) => {
                          e.stopPropagation()
                          runConfirmedAction({
                            confirmKey:
                              'engineering.labeling.toasts.deleteConfirm',
                            onAction: async () => {
                              await deleteMutation.mutateAsync(item.id)
                            },
                          })
                        }}
                      >
                        <Trash2 className='size-3.5' />
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

      <LabelingActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSave={handleSave}
        isLoading={saveMutation.isPending}
      />
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

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
  BookOpen,
  Download,
  Eye,
  Hash,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
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
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { DataTablePagination } from '@/components/data-table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { CADViewerDialog } from '../components/cad-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { SpecActionDialog } from '../components/spec-action-dialog'
import { type TechnicalSpec } from '../data/schema'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'
import { FileResolverService } from '../services/file-resolver-service'
import { SpecsService } from '../services/specs-service'
import {
  getEngineeringDbFileVisual,
  getEngineeringDbPreviewKind,
} from '../view-helpers'

type SpecsRowViewModel = {
  item: TechnicalSpec
  searchText: string
}

export function SpecsTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-db/specs',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<TechnicalSpec | undefined>(
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

  useEffect(() => {
    return () => {
      if (previewFile?.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile?.url])

  const { data = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: TechnicalSpec
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      const { data: formData, isPatch, delta, version } = params

      if (isPatch && delta) {
        await SpecsService.patchSpec(formData.id, delta, version!)
        return
      }

      await SpecsService.saveSpec(formData)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
      })
      setOpen(false)
      setCurrentRow(undefined)
      toast.success(
        variables.isPatch
          ? t('engineering.specs.toasts.updateSuccess')
          : t('engineering.specs.toasts.saveSuccess')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SpecsService.deleteSpec(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
      })
      toast.success(t('engineering.specs.toasts.deleteSuccess'))
    },
  })

  const filteredData = useMemo(() => {
    const rows = data.map<SpecsRowViewModel>((item) => ({
      item,
      searchText: [
        item.name,
        item.category,
        item.description || '',
        item.fileExtension || '',
      ]
        .join(' ')
        .toLowerCase(),
    }))

    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return rows
    }

    return rows.filter((row) => row.searchText.includes(normalizedSearch))
  }, [data, searchTerm])

  const handleDownload = async (item: TechnicalSpec) => {
    if (item.fileUrl) {
      const url = await FileResolverService.resolveFileUrl(item.fileUrl)
      if (url) window.open(url, '_blank')
    } else {
      toast.error(t('engineering.specs.toasts.noAttachment'))
    }
  }

  const handlePreview = async (item: TechnicalSpec) => {
    if (item.fileUrl) {
      const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
      if (!resolvedUrl) {
        toast.error(t('engineering.specs.toasts.unResolved'))
        return
      }
      setPreviewFile({ url: resolvedUrl, name: item.name })
      if (getEngineeringDbPreviewKind(item.fileExtension) === 'excel') {
        setExcelPreviewOpen(true)
      } else {
        setPdfPreviewOpen(true)
      }
    } else {
      toast.error(t('engineering.specs.toasts.noFile'))
    }
  }

  const columns: ColumnDef<SpecsRowViewModel>[] = [
    {
      accessorKey: 'item.name',
      header: t('engineering.specs.table.name'),
      cell: ({ row }) => {
        const fileVisual = getEngineeringDbFileVisual({
          extension: row.original.item.fileExtension,
          category: 'SPEC',
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
                <span className='text-[10px] font-medium tracking-tight text-muted-foreground uppercase'>
                  {t('engineering.specs.table.version')}:{' '}
                  {row.original.item.version} |
                  {row.original.item.createdAt
                    ? new Date(row.original.item.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'item.category',
      header: t('engineering.specs.table.category'),
      cell: ({ row }) => (
        <Badge
          variant='outline'
          className='h-5 w-fit rounded-full border-amber-500/20 bg-amber-500/10 px-2 text-[10px] font-bold whitespace-nowrap text-amber-500'
        >
          {row.original.item.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'item.description',
      header: t('engineering.specs.table.description'),
      cell: ({ row }) => (
        <p className='max-w-[200px] truncate text-[12px] font-medium text-muted-foreground italic'>
          {row.original.item.description || t('engineering.specs.table.noDesc')}
        </p>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.specs.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500'
            onClick={() => handleDownload(row.original.item)}
          >
            <Download className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500'
            onClick={() => handlePreview(row.original.item)}
          >
            <Eye className='size-3.5' />
          </Button>
          <div className='mx-1 h-4 w-px bg-border' />
          <div onClick={(event) => event.stopPropagation()}>
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.engineeringSpec}
              targetId={row.original.item.id}
              targetName={row.original.item.name}
              label={t('common.audit.trigger')}
              iconOnly
              className='size-8 rounded-full border-transparent px-0 hover:bg-violet-500/10 hover:text-violet-500'
            />
          </div>
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
                confirmKey: 'engineering.specs.toasts.deleteConfirm',
                onAction: async () => {
                  if (!row.original.item.id) {
                    toast.error(t('engineering.specs.toasts.noId'))
                    return
                  }
                  try {
                    await deleteMutation.mutateAsync(row.original.item.id)
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : t('engineering.specs.toasts.deleteFailed')
                    toast.error(message)
                  }
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
    data: TechnicalSpec
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    const { data: formData, isPatch, delta, version } = params

    await saveMutation.mutateAsync({ data: formData, isPatch, delta, version })
  }

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      {/* 响应式工业页眉 */}
      <IndustrialHeader
        icon={BookOpen}
        title={t('engineering.specs.overview.title')}
        description={t('engineering.specs.overview.description')}
        gradient
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-primary/10 bg-primary/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-primary/60 uppercase'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-primary' />
          </div>
        }
      />

      {/* 功能操作行 - 响应式 */}
      <div className='flex flex-col items-center justify-between gap-3 overflow-hidden rounded-[24px] border border-dashed border-muted-foreground/10 bg-muted/5 p-3 px-4 shadow-inner sm:flex-row'>
        <div className='group relative w-full sm:w-80'>
          <Search className='absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('engineering.specs.placeholders.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-10 w-full rounded-xl border-none bg-background pl-9 text-sm font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
          />
        </div>
        <div className='flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-end'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.engineeringSpec}
            targetName={t('engineering.specs.overview.title')}
            label={t('common.audit.trigger')}
            className='h-10 w-full rounded-full px-4 text-[10px] font-black uppercase sm:w-auto'
          />
          <Button
            onClick={() => {
              setCurrentRow(undefined)
              setOpen(true)
            }}
            className='h-10 w-full gap-1.5 rounded-full bg-emerald-600 px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 sm:w-auto'
          >
            <Plus className='size-3.5' />{' '}
            {t('engineering.specs.placeholders.upload')}
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
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
                    className='h-64 text-center text-[10px] font-black tracking-widest uppercase italic antialiased opacity-20'
                  >
                    {t('common.status.syncing')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'group h-12 cursor-pointer border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5',
                      row.original.item.id === highlightId &&
                        'animate-pulse border-2 border-primary/20 bg-primary/5 shadow-inner'
                    )}
                    onClick={() => handlePreview(row.original.item)}
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
                    className='h-64 text-center text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase italic antialiased'
                  >
                    {t('engineering.specs.table.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className='flex flex-col gap-4 md:hidden'>
        {isLoading ? (
          <div className='animate-pulse p-12 text-center text-[10px] font-black text-muted-foreground uppercase italic'>
            {t('common.status.syncing')}
          </div>
        ) : filteredData.length === 0 ? (
          <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-12 text-center text-[10px] text-muted-foreground uppercase italic opacity-40'>
            {t('engineering.specs.table.empty')}
          </div>
        ) : (
          filteredData.map((row) => {
            const item = row.item
            const fileVisual = getEngineeringDbFileVisual({
              extension: item.fileExtension,
              category: 'SPEC',
            })
            const Icon = fileVisual.icon
            return (
              <div
                key={item.id}
                onClick={() => handlePreview(item)}
                className={cn(
                  'group relative overflow-hidden rounded-[28px] border border-dashed border-muted/50 bg-background/50 p-5 transition-all active:scale-[0.98]',
                  item.id === highlightId &&
                    'animate-pulse bg-primary/5 ring-2 ring-primary/20'
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
                        fileVisual.containerClassName
                      )}
                    >
                      <Icon
                        className={cn('size-5', fileVisual.iconClassName)}
                      />
                    </div>
                    <Badge
                      variant='outline'
                      className='h-5 rounded-full border-none bg-muted/50 px-3 font-mono text-[10px] font-black text-muted-foreground italic'
                    >
                      {t('engineering.specs.table.rev')}: {item.version}
                    </Badge>
                  </div>

                  <div>
                    <h4 className='line-clamp-2 text-sm leading-tight font-black tracking-tight transition-colors group-active:text-primary'>
                      {item.name}
                    </h4>
                    <div className='mt-2 flex items-center gap-2 font-black tracking-widest uppercase'>
                      <Badge
                        variant='outline'
                        className='h-4 rounded-full border-none bg-amber-500/10 px-2 text-[8px] text-amber-500'
                      >
                        {item.category}
                      </Badge>
                      <div className='size-1 rounded-full bg-muted-foreground/20' />
                      <div className='flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 italic'>
                        <Hash className='size-2.5 opacity-30' />
                        {item.id.split('-').pop()}
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
                    <div className='flex items-center gap-1.5'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(item)
                        }}
                      >
                        <Download className='size-3.5' />
                      </Button>
                      <div onClick={(event) => event.stopPropagation()}>
                        <AuditTimelineTriggerButton
                          module={AUDIT_MODULES.engineeringSpec}
                          targetId={item.id}
                          targetName={item.name}
                          label={t('common.audit.trigger')}
                          iconOnly
                          className='size-8 rounded-full border-transparent px-0 hover:bg-violet-500/10 hover:text-violet-500'
                        />
                      </div>
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
                              'engineering.specs.toasts.deleteMobileConfirm',
                            onAction: async () => {
                              if (!item.id) {
                                toast.error(t('engineering.specs.toasts.noId'))
                                return
                              }
                              try {
                                await deleteMutation.mutateAsync(item.id)
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : t('engineering.specs.toasts.deleteFailed')
                                toast.error(message)
                              }
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

      <SpecActionDialog
        key={`${currentRow?.id ?? 'new-spec'}-${open ? 'open' : 'closed'}`}
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
      />
      <ExcelViewerDialog
        open={excelPreviewOpen}
        onOpenChange={setExcelPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
      />
    </div>
  )
}

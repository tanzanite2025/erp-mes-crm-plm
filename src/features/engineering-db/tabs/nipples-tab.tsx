'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Box,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { NippleActionDialog } from '../components/nipple-action-dialog'
import { type Nipple } from '../data/nipple-schema'
import { ENGINEERING_DB_NIPPLES_QUERY_KEY } from '../query-keys'
import { nippleService } from '../services/nipple-service'

type NipplesRowViewModel = {
  item: Nipple
  searchText: string
}

export function NipplesTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-reference/nipples',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Nipple | undefined>(undefined)

  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
  } | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
    queryFn: () => nippleService.getNipples(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: Nipple
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      const { data: nextData, isPatch, delta, version } = params
      if (isPatch && delta) {
        await nippleService.patchNipple(nextData.id, delta, version!)
        return
      }

      await nippleService.saveNipple(nextData)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
      })
      setOpen(false)
      setCurrentRow(undefined)
      toast.success(
        variables.isPatch
          ? t('engineering.nipples.toasts.updateSuccess')
          : t('engineering.nipples.toasts.saveSuccess')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nippleService.deleteNipple(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
      })
      toast.success(t('engineering.nipples.toasts.deleteSuccess'))
    },
  })

  const filteredData = useMemo(() => {
    const rows = data.map<NipplesRowViewModel>((item) => ({
      item,
      searchText: [
        item.name,
        item.brand || '',
        item.material || '',
        item.color || '',
        item.length || '',
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

  const handlePreview = (item: Nipple) => {
    if (item.fileUrl) {
      setPreviewFile({ url: item.fileUrl, name: item.name })
      setImagePreviewOpen(true)
    } else {
      toast.error(t('engineering.db.status.noAttachment'))
    }
  }

  const handleDelete = async (id: string) => {
    runConfirmedAction({
      confirmKey: 'engineering.nipples.toasts.deleteConfirm',
      onAction: async () => {
        await deleteMutation.mutateAsync(id)
      },
    })
  }

  const columns: ColumnDef<NipplesRowViewModel>[] = [
    {
      accessorKey: 'item.name',
      header: t('engineering.nipples.table.name'),
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 shadow-sm'>
            <Box className='size-5 text-orange-600' />
          </div>
          <div className='flex flex-col text-left'>
            <span className='text-sm font-bold text-foreground'>
              {row.original.item.name}
            </span>
            <span className='font-mono text-[10px] tracking-tighter uppercase opacity-40'>
              {row.original.item.brand || 'GENERIC'}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'item.length',
      header: t('engineering.nipples.table.length'),
      cell: ({ row }) => (
        <span className='text-sm font-black text-orange-600 italic'>
          {row.original.item.length ? `${row.original.item.length}mm` : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'item.material',
      header: t('engineering.nipples.table.material'),
      cell: ({ row }) => (
        <Badge
          variant='outline'
          className='border-none bg-muted/50 text-[10px] font-bold uppercase'
        >
          {row.original.item.material || '--'}
        </Badge>
      ),
    },
    {
      accessorKey: 'item.color',
      header: t('engineering.nipples.table.color'),
      cell: ({ row }) => (
        <span className='text-[11px] font-medium text-muted-foreground'>
          {row.original.item.color || '--'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.nipples.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => handlePreview(row.original.item)}
          >
            <Eye className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => {
              setCurrentRow(row.original.item)
              setOpen(true)
            }}
          >
            <Edit2 className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive'
            onClick={() => handleDelete(row.original.item.id)}
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

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Layers}
        title={`${t('engineering.nipples.overview.title')} / ${t('common.actions.preview')}`}
        description={t('engineering.nipples.overview.description')}
        gradient
        innerClassName='text-orange-600'
        statusBadge={
          <div className='relative flex items-center gap-4'>
            <div className='mr-4 hidden flex-col items-end md:flex'>
              <span className='font-mono text-[8px] tracking-tighter uppercase opacity-40'>
                SYSTEM_VAULT_STATUS
              </span>
              <span className='text-[10px] font-black text-orange-600 italic'>
                SYNCHRONIZED
              </span>
            </div>
            <Button
              onClick={() => {
                setCurrentRow(undefined)
                setOpen(true)
              }}
              className='h-12 rounded-full bg-orange-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-orange-600/20 hover:bg-orange-700'
            >
              <Plus className='mr-2 h-4 w-4' />{' '}
              {t('engineering.nipples.table.upload')}
            </Button>
          </div>
        }
        className='border-muted-foreground/10'
      />

      {/* Table Section */}
      <div className='overflow-hidden rounded-[24px] border border-dashed border-muted-foreground/10 bg-background/50 backdrop-blur-sm'>
        <div className='flex items-center gap-4 border-b border-dashed border-muted-foreground/10 p-6'>
          <div className='relative max-w-sm flex-1'>
            <Search className='absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40' />
            <Input
              placeholder={t('engineering.nipples.placeholders.search')}
              className='h-11 rounded-2xl border-none bg-muted/30 pl-10 text-[11px] font-bold shadow-inner'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className='overflow-x-auto p-0'>
          <Table>
            <TableHeader className='h-14 bg-muted/30'>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className='px-6 text-[10px] font-black tracking-widest uppercase'
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
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
                    <div className='flex flex-col items-center gap-2 opacity-40'>
                      <div className='size-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent' />
                      <span className='text-[10px] font-black tracking-widest uppercase'>
                        {t('common.status.syncing')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'h-16 border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5',
                      row.original.item.id === highlightId && 'bg-primary/5'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='px-6'>
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
                    className='h-64 text-center'
                  >
                    <div className='flex flex-col items-center gap-2 opacity-20'>
                      <Box className='size-12 stroke-[1px]' />
                      <span className='text-[10px] font-black tracking-widest uppercase'>
                        {t('engineering.nipples.table.empty')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className='border-t border-dashed border-muted-foreground/10 p-4'>
          <DataTablePagination table={table} />
        </div>
      </div>

      <NippleActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSave={({ data: val, isPatch, delta, version }) => {
          void saveMutation.mutateAsync({ data: val, isPatch, delta, version })
        }}
        isLoading={saveMutation.isPending}
      />

      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className='overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-3xl'>
          <DialogHeader className='relative flex h-20 shrink-0 flex-col justify-center border-b border-dashed border-muted-foreground/10 bg-muted/5 p-6 pb-0 md:p-8'>
            <DialogTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase italic'>
              <ImageIcon className='size-4 text-orange-600' />
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className='flex min-h-[300px] items-center justify-center bg-muted/10 p-4'>
            <img
              src={previewFile?.url}
              className='max-h-[70vh] max-w-full rounded-2xl border-4 border-white object-contain shadow-2xl'
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { Search, Plus, Edit, Trash2, Cpu, ImageIcon, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { HubActionDialog } from '../components/hub-action-dialog'
import { type Hub } from '../data/hub-schema'
import { ENGINEERING_DB_HUBS_QUERY_KEY } from '../query-keys'
import { hubService } from '../services/hub-service'

type HubsRowViewModel = {
  item: Hub
  searchText: string
}

export function HubsTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-reference/hubs',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Hub | undefined>(undefined)

  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
  } | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
    queryFn: () => hubService.getHubs(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: Hub
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      const { data: nextData, isPatch, delta, version } = params
      if (isPatch && delta) {
        await hubService.patchHub(nextData.id, delta, version!)
        return
      }
      await hubService.saveHub(nextData)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
      })
      setOpen(false)
      setCurrentRow(undefined)
      toast.success(
        variables.isPatch
          ? t('engineering.hubs.toasts.updateSuccess')
          : t('engineering.hubs.toasts.saveSuccess')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubService.deleteHub(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
      })
      toast.success(t('engineering.hubs.toasts.deleteSuccess'))
    },
  })

  const filteredData = useMemo(() => {
    const rows = data.map<HubsRowViewModel>((item) => ({
      item,
      searchText: [
        item.name,
        item.brand || '',
        item.model || '',
        item.holeCount || '',
        item.pcdLeft || '',
        item.pcdRight || '',
        item.flangeLeft || '',
        item.flangeRight || '',
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

  const handlePreview = (item: Hub) => {
    if (item.fileUrl) {
      setPreviewFile({ url: item.fileUrl, name: item.name })
      setImagePreviewOpen(true)
    } else {
      toast.error(t('engineering.spokeLength.toasts.noFile'))
    }
  }

  const columns: ColumnDef<HubsRowViewModel>[] = [
    {
      accessorKey: 'item.name',
      header: t('engineering.hubs.table.name'),
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 shadow-sm'>
            <Cpu className='size-5 text-indigo-600' />
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-bold text-foreground'>
              {row.original.item.name}
            </span>
            <span className='font-mono text-[10px] tracking-widest text-muted-foreground uppercase'>
              {row.original.item.brand ||
                t('engineering.labeling.table.generic')}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'item.holeCount',
      header: t('engineering.hubs.table.holes'),
      cell: ({ row }) => (
        <Badge variant='outline' className='border-none bg-muted/50 font-mono'>
          {row.original.item.holeCount || '--'}H
        </Badge>
      ),
    },
    {
      header: t('engineering.hubs.table.geometry'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2 font-mono text-[11px]'>
          <span className='text-muted-foreground'>
            {row.original.item.pcdLeft || '--'}
          </span>
          <span className='opacity-20'>/</span>
          <span className='text-muted-foreground'>
            {row.original.item.pcdRight || '--'}
          </span>
        </div>
      ),
    },
    {
      header: t('engineering.hubs.table.flange'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2 font-mono text-[11px]'>
          <span className='font-bold text-indigo-600'>
            {row.original.item.flangeLeft || '--'}
          </span>
          <span className='opacity-20'>/</span>
          <span className='font-bold text-indigo-600'>
            {row.original.item.flangeRight || '--'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.hubs.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
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
            <Edit className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive'
            onClick={() =>
              runConfirmedAction({
                confirmKey: 'engineering.hubs.toasts.deleteConfirm',
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

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={Cpu}
        title={t('engineering.hubs.overview.title')}
        description={t('engineering.hubs.overview.description')}
        innerClassName='text-indigo-600'
        className='border-muted-foreground/10'
      />

      <div className='flex items-center justify-between gap-4 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/5 p-8 shadow-inner'>
        <div className='group relative w-96'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/30' />
          <Input
            placeholder={t('engineering.hubs.placeholders.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-12 rounded-2xl border-none bg-background pl-10 shadow-inner'
          />
        </div>
        <Button
          onClick={() => {
            setCurrentRow(undefined)
            setOpen(true)
          }}
          className='h-11 gap-2 rounded-full bg-indigo-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95'
        >
          <Plus className='size-4' /> {t('engineering.hubs.table.upload')}
        </Button>
      </div>

      <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
        <CardContent className='p-0'>
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
                    {t('common.status.syncing')}
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
                    className='h-64 text-center text-muted-foreground/30'
                  >
                    {t('engineering.hubs.table.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <HubActionDialog
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
          <DialogHeader className='border-b border-dashed border-muted-foreground/10 bg-muted/5 p-6'>
            <DialogTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase italic'>
              <ImageIcon className='size-4 text-indigo-600' />
              {previewFile?.name} / {t('engineering.spokeLength.table.preview')}
            </DialogTitle>
          </DialogHeader>
          <div className='flex min-h-[300px] items-center justify-center bg-muted/10 p-4'>
            {previewFile?.url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewFile.url}
                className='h-[600px] w-full rounded-2xl'
              />
            ) : (
              <img
                src={previewFile?.url}
                className='max-h-[70vh] max-w-full rounded-2xl border-4 border-white object-contain'
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

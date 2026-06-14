'use client'

import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { flexRender } from '@tanstack/react-table'
import { AlertCircle, Plus, RefreshCw, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
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
import { DataTablePagination } from '@/components/data-table'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { SpokeLengthActionDialog } from '../components/spoke-length-action-dialog'
import { SpokeLengthPreviewDialog } from '../components/spoke-length-preview-dialog'
import { type SpokeLength } from '../data/schema'
import { useSpokeLengthColumns } from '../hooks/use-spoke-length-columns'
import { useSpokeLengthMgmt } from '../hooks/use-spoke-length-mgmt'
import { FileResolverService } from '../services/file-resolver-service'

export function SpokeLengthTab() {
  const { t } = useLanguage()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-reference/spoke-length',
  })
  const {
    readResource,
    filteredData,
    isLoading,
    isRefreshing,
    searchTerm,
    setSearchTerm,
    handleDelete,
    handleSave,
    refresh,
    retryRead,
  } = useSpokeLengthMgmt()

  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<SpokeLength | undefined>(
    undefined
  )
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
  } | null>(null)

  const statusBadge =
    readResource.status === 'error' ? (
      <div className='flex w-fit items-center gap-4 rounded-full border border-rose-500/15 bg-rose-500/5 px-4 py-1'>
        <span className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
          读取异常
        </span>
        <div className='size-1.5 rounded-full bg-rose-500' />
      </div>
    ) : readResource.status === 'loading' ? (
      <div className='flex w-fit items-center gap-4 rounded-full border border-amber-500/15 bg-amber-500/5 px-4 py-1'>
        <span className='text-[10px] font-black tracking-widest text-amber-700 uppercase'>
          {t('common.status.syncing')}
        </span>
        <RefreshCw className='size-3.5 animate-spin text-amber-500' />
      </div>
    ) : (
      <div className='flex w-fit items-center gap-4 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-4 py-1'>
        <span className='text-[10px] font-black tracking-widest text-indigo-600/60 uppercase'>
          {t('common.status.ready')}
        </span>
        <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
      </div>
    )

  const handlePreview = async (item: SpokeLength) => {
    if (item.fileUrl) {
      const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
      if (!resolvedUrl) {
        toast.error(t('engineering.spokeLength.toasts.unResolved'))
        return
      }
      setPreviewFile({ url: resolvedUrl, name: item.name })
      setImagePreviewOpen(true)
    } else {
      toast.error(t('engineering.spokeLength.toasts.noFile'))
    }
  }

  const columns = useSpokeLengthColumns({
    t,
    onPreview: handlePreview,
    onEdit: (item) => {
      setCurrentRow(item)
      setOpen(true)
    },
    onDelete: handleDelete,
  })

  const table = useUdsClientTable({
    data: filteredData,
    columns,
  })

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in md:gap-8'>
      <IndustrialHeader
        icon={Ruler}
        title={t('engineering.spokeLength.overview.title')}
        description={t('engineering.spokeLength.overview.description')}
        gradient
        statusBadge={statusBadge}
        innerClassName='text-indigo-600'
      />

      {readResource.status === 'error' ? (
        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
          <AlertCircle className='size-8 text-rose-500' />
          <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            辐条关联库加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {readResource.error.message || '请重试后再查看辐条关联库。'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void retryRead()
            }}
          >
            <RefreshCw className='size-3.5' />
            重试
          </Button>
        </div>
      ) : (
        <>
          <IndustrialActionBar
            searchPlaceholder={t('engineering.spokeLength.placeholders.search')}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            rightContent={
              <Button
                onClick={() => {
                  setCurrentRow(undefined)
                  setOpen(true)
                }}
                className='h-11 w-full gap-2 rounded-full bg-indigo-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95 sm:w-auto'
              >
                <Plus className='size-4' />{' '}
                {t('engineering.spokeLength.table.upload')}
              </Button>
            }
            className='border-indigo-600/10'
          />

          {/* 数据表格 */}
          <Card className='hidden overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none md:block'>
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
                          className='px-6 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'
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
                        className={cn(
                          'group h-20 border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5',
                          row.original.item.id === highlightId &&
                            'animate-pulse border-2 border-primary/20 bg-primary/5 shadow-inner'
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
                        {t('engineering.spokeLength.table.empty')}
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
        </>
      )}

      {open ? (
        <SpokeLengthActionDialog
          open={open}
          onOpenChange={setOpen}
          currentRow={currentRow}
          onSave={handleSave}
        />
      ) : null}
      {imagePreviewOpen ? (
        <SpokeLengthPreviewDialog
          open={imagePreviewOpen}
          onOpenChange={setImagePreviewOpen}
          previewFile={previewFile}
        />
      ) : null}
    </div>
  )
}

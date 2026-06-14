'use client'

import { useMemo, useState } from 'react'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { CornerDownRight, Edit, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isConflictError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type ProductType } from '../data/schema'
import { useProductTypeWriteActions } from '../hooks/use-product-type-write-actions'
import { type SaveProductTypeInput } from '../mutation-types'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
} from '../utils/product-type-tree'
import { ProductTypeActionDialog } from './product-type-action-dialog'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productTypes: ProductType[]
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : ''

export function CategoryManagerDialog({
  open,
  onOpenChange,
  productTypes,
}: CategoryManagerDialogProps) {
  const { t } = useLanguage()
  const [actionOpen, setActionOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<ProductType | undefined>(
    undefined
  )
  const { saveProductType, deleteProductType } = useProductTypeWriteActions()

  const displayData = useMemo(
    () => (productTypes ? buildOrderedProductTypes(productTypes, true) : []),
    [productTypes]
  )
  const hierarchyMetaMap = useMemo(
    () => buildProductTypeHierarchyMetaMap(productTypes, true),
    [productTypes]
  )

  const resolveLevelLabel = (level: number) => {
    if (level <= 0) return t('engineering.categoryArchive.labels.level1')
    if (level === 1) return t('engineering.categoryArchive.labels.level2')
    return t('engineering.categoryArchive.labels.level3')
  }

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className='pl-4'>
          {t('engineering.categoryArchive.columns.name')}
        </div>
      ),
      cell: ({ row }) => {
        const hierarchy = hierarchyMetaMap.get(row.original.id)
        const level = hierarchy?.level ?? (row.original.parentId ? 1 : 0)
        const isSub = level > 0
        const levelLabel = resolveLevelLabel(level)
        const isBaseModel = level >= 2

        return (
          <div
            className={cn(
              'flex items-center gap-1 sm:gap-2',
              isSub ? 'pl-2 sm:pl-4' : 'pl-2 sm:pl-4'
            )}
            style={{ paddingLeft: `calc(${level} * 18px + 8px)` }}
          >
            {isSub ? (
              <>
                <CornerDownRight className='size-2.5 shrink-0 text-primary/30 sm:size-3' />
                <div className='flex min-w-0 items-center gap-1.5 sm:gap-2'>
                  <span className='text-[10px] font-bold tracking-tight break-all text-muted-foreground sm:text-xs'>
                    {row.original.name}
                  </span>
                  <Badge
                    variant='outline'
                    className='h-4 rounded-full border-dashed px-1.5 text-[8px] font-black tracking-wide uppercase'
                  >
                    {levelLabel}
                  </Badge>
                  {isBaseModel ? (
                    <Badge
                      variant='outline'
                      className='h-4 rounded-full border-blue-200 bg-blue-50 px-1.5 text-[8px] font-black tracking-wide text-blue-700 uppercase'
                    >
                      {t('engineering.categoryArchive.labels.baseModel')}
                    </Badge>
                  ) : null}
                </div>
              </>
            ) : (
              <div className='flex min-w-0 items-center gap-1.5 sm:gap-2'>
                <span className='text-[11px] font-black tracking-tighter break-all text-primary uppercase italic sm:text-xs'>
                  {row.original.name}
                </span>
                <Badge
                  variant='outline'
                  className='h-4 rounded-full border-dashed px-1.5 text-[8px] font-black tracking-wide uppercase'
                >
                  {levelLabel}
                </Badge>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'code',
      header: () => (
        <div className='hidden sm:block'>
          {t('engineering.categoryArchive.columns.code')}
        </div>
      ),
      cell: ({ row }) => (
        <div className='hidden sm:block'>
          <code className='rounded-lg bg-primary/5 px-2 py-0.5 font-mono text-[10px] font-black text-primary'>
            {row.original.code}
          </code>
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.categoryArchive.columns.actions'),
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-0.5 pr-2 sm:gap-1 sm:pr-4'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7 rounded-xl transition-all hover:bg-primary/5 hover:text-primary sm:size-8'
            onClick={() => {
              setCurrentRow(row.original)
              setActionOpen(true)
            }}
          >
            <Edit className='size-3 opacity-40 sm:size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-7 rounded-xl text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive sm:size-8'
            onClick={async () => {
              const confirmed = window.confirm(
                t('engineering.categoryArchive.confirms.delete')
              )
              if (!confirmed) return

              try {
                await deleteProductType(row.original.id)
                toast.success(
                  t('engineering.categoryArchive.toasts.deleteSuccess')
                )
              } catch (error) {
                toast.error(
                  t('engineering.categoryArchive.toasts.deleteFailed', {
                    message: getErrorMessage(error),
                  })
                )
              }
            }}
          >
            <Trash2 className='size-3 sm:size-3.5' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data: displayData,
    columns,
    enableSorting: false,
  })

  const handleFormSubmit = async (formData: SaveProductTypeInput) => {
    try {
      await saveProductType({ formData, currentRow })
      toast.success(t('engineering.categoryArchive.toasts.saveSuccess'))
      setActionOpen(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('engineering.categoryArchive.toasts.conflict'))
        return
      }

      toast.error(
        t('engineering.categoryArchive.toasts.saveFailed', {
          message: getErrorMessage(error),
        })
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] w-[95vw] flex-col overflow-hidden rounded-[24px] border-none p-0 shadow-2xl sm:h-[700px] sm:w-full sm:max-w-3xl sm:rounded-[32px]'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <DialogHeader className='relative p-4 pb-3 sm:p-8 sm:pb-4'>
          <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
            <div className='flex flex-col gap-1'>
              <DialogTitle className='flex items-center gap-2 text-base font-black tracking-tighter text-primary uppercase italic sm:text-lg'>
                <Settings2 className='size-4 sm:size-5' />
                <span className='truncate'>
                  {t('engineering.categoryArchive.header.title')}
                </span>
              </DialogTitle>
              <DialogDescription className='text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase opacity-60 sm:text-[9px]'>
                {t('engineering.categoryArchive.header.description')}
              </DialogDescription>
            </div>
            <Button
              onClick={() => {
                setCurrentRow(undefined)
                setActionOpen(true)
              }}
              className='h-9 w-full rounded-full px-4 text-[9px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 sm:h-11 sm:w-auto sm:px-6 sm:text-[10px]'
            >
              <Plus className='mr-1 size-3 sm:size-4' />{' '}
              {t('engineering.categoryArchive.buttons.add')}
            </Button>
          </div>
        </DialogHeader>

        <div className='relative flex-1 overflow-auto px-4 pb-4 sm:px-8 sm:pb-8'>
          <div className='relative overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
            <Table>
              <TableHeader className='h-12 bg-muted/30'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className='border-b border-dashed border-muted/50 hover:bg-transparent'
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className='p-0 align-middle text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className='group h-14 border-b border-dashed border-muted/50 transition-all hover:bg-muted/30'
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='p-0 align-middle'>
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
                      className='h-32 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase'
                    >
                      {t('engineering.categoryArchive.empty.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className='mt-6'>
            <DataTablePagination table={table} />
          </div>
        </div>

        <ProductTypeActionDialog
          open={actionOpen}
          onOpenChange={setActionOpen}
          currentRow={currentRow}
          onSubmit={handleFormSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

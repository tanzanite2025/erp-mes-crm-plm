'use client'

import { useMemo, useState } from 'react'

import {
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { CornerDownRight, Edit, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { DataTablePagination } from '@/components/data-table'
import { useUdsClientTable } from '@/hooks/use-uds-table'
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
import { isConflictError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { ProductTypeActionDialog } from './product-type-action-dialog'
import { type ProductType } from '../data/schema'
import { useProductTypeWriteActions } from '../hooks/use-product-type-write-actions'
import { type SaveProductTypeInput } from '../mutation-types'
import { buildOrderedProductTypes } from '../utils/product-type-tree'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productTypes: ProductType[]
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '')

export function CategoryManagerDialog({ open, onOpenChange, productTypes }: CategoryManagerDialogProps) {
  const { t } = useLanguage()
  const [actionOpen, setActionOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<ProductType | undefined>(undefined)
  const { saveProductType, deleteProductType } = useProductTypeWriteActions()

  const displayData = useMemo(() => (productTypes ? buildOrderedProductTypes(productTypes, true) : []), [productTypes])

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name',
      header: () => <div className='pl-4'>{t('engineering.categoryArchive.columns.name')}</div>,
      cell: ({ row }) => {
        const isSub = Boolean(row.original.parentId)

        return (
          <div className={cn('flex items-center gap-1 sm:gap-2', isSub ? 'pl-4 sm:pl-10' : 'pl-2 sm:pl-4')}>
            {isSub ? (
              <>
                <CornerDownRight className='size-2.5 sm:size-3 text-primary/30 shrink-0' />
                <span className='text-[10px] sm:text-xs font-bold text-muted-foreground tracking-tight break-all'>
                  {row.original.name}
                </span>
              </>
            ) : (
              <span className='text-[11px] sm:text-xs font-black text-primary uppercase italic tracking-tighter break-all'>
                {row.original.name}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'code',
      header: () => <div className='hidden sm:block'>{t('engineering.categoryArchive.columns.code')}</div>,
      cell: ({ row }) => (
        <div className='hidden sm:block'>
          <code className='bg-primary/5 text-primary px-2 py-0.5 rounded-lg text-[10px] font-mono font-black'>
            {row.original.code}
          </code>
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.categoryArchive.columns.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-0.5 sm:gap-1 pr-2 sm:pr-4 justify-end'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7 sm:size-8 rounded-xl hover:bg-primary/5 hover:text-primary transition-all'
            onClick={() => {
              setCurrentRow(row.original)
              setActionOpen(true)
            }}
          >
            <Edit className='size-3 sm:size-3.5 opacity-40' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-7 sm:size-8 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all'
            onClick={async () => {
              const confirmed = window.confirm(t('engineering.categoryArchive.confirms.delete'))
              if (!confirmed) return

              try {
                await deleteProductType(row.original.id)
                toast.success(t('engineering.categoryArchive.toasts.deleteSuccess'))
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
      <DialogContent className='w-[95vw] sm:w-full sm:max-w-3xl h-[85vh] sm:h-[700px] flex flex-col p-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border-none shadow-2xl'>
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
        <DialogHeader className='p-4 sm:p-8 pb-3 sm:pb-4 relative'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex flex-col gap-1'>
              <DialogTitle className='text-base sm:text-lg font-black tracking-tighter italic uppercase text-primary flex items-center gap-2'>
                <Settings2 className='size-4 sm:size-5' />
                <span className='truncate'>{t('engineering.categoryArchive.header.title')}</span>
              </DialogTitle>
              <DialogDescription className='text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 opacity-60'>
                {t('engineering.categoryArchive.header.description')}
              </DialogDescription>
            </div>
            <Button
              onClick={() => {
                setCurrentRow(undefined)
                setActionOpen(true)
              }}
              className='rounded-full h-9 sm:h-11 px-4 sm:px-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto'
            >
              <Plus className='mr-1 size-3 sm:size-4' /> {t('engineering.categoryArchive.buttons.add')}
            </Button>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-auto px-4 sm:px-8 pb-4 sm:pb-8 relative'>
          <div className='relative rounded-[24px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
            <Table>
              <TableHeader className='bg-muted/30 h-12'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-dashed border-muted/50'>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className='p-0 align-middle text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className='h-14 group hover:bg-muted/30 transition-all border-b border-dashed border-muted/50'>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='p-0 align-middle'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground font-black uppercase tracking-widest text-[10px]'>
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

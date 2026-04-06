'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { CornerDownRight, Edit, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { DataTablePagination } from '@/components/data-table'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { ProductTypeActionDialog } from '../components/product-type-action-dialog'
import { type Product, type ProductType } from '../data/schema'
import { productService } from '../services/product-service'

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '')
const logger = createLogger('ProductTypesMgmt')

export function ProductTypesMgmt() {
  const { t } = useLanguage()
  const [data, setData] = useState<ProductType[]>([])
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<ProductType | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const stored = await productService.getProductTypes()
      setData(stored || [])
    } catch (loadError) {
      setError(loadError)
      logger.error('Failed to load product types', loadError)
    }
  }, [])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadData()
    }, 0)

    window.addEventListener('xdfc_product_types_data_updated', loadData)
    return () => {
      globalThis.clearTimeout(timer)
      window.removeEventListener('xdfc_product_types_data_updated', loadData)
    }
  }, [loadData])

  const displayData = useMemo(() => {
    if (!data.length) return []

    const childrenMap = new Map<string, ProductType[]>()
    const roots: ProductType[] = []

    data.forEach((item) => {
      if (!item.parentId) {
        roots.push(item)
        return
      }

      const children = childrenMap.get(item.parentId) || []
      children.push(item)
      childrenMap.set(item.parentId, children)
    })

    const result: ProductType[] = []
    const processedIds = new Set<string>()

    roots.forEach((root) => {
      result.push(root)
      processedIds.add(root.id)

      const children = childrenMap.get(root.id) || []
      children.forEach((child) => {
        result.push(child)
        processedIds.add(child.id)
      })
    })

    data.forEach((item) => {
      if (!processedIds.has(item.id)) {
        result.push(item)
      }
    })

    return result
  }, [data])

  const typeMap = useMemo(() => new Map(data.map((item) => [item.id, item])), [data])

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name',
      header: () => <div className='pl-6'>{t('engineering.categoryArchive.columns.name')}</div>,
      cell: ({ row }) => {
        const isSub = Boolean(row.original.parentId)

        return (
          <div className={cn('flex items-center gap-2', isSub ? 'pl-12' : 'pl-6')}>
            {isSub ? (
              <>
                <CornerDownRight className='size-3.5 text-primary/30 shrink-0' />
                <span className='font-bold text-sm tracking-tight text-muted-foreground'>{row.original.name}</span>
              </>
            ) : (
              <span className='font-black text-sm tracking-tighter italic uppercase text-primary'>
                {row.original.name}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'code',
      header: t('engineering.categoryArchive.columns.code'),
      cell: ({ row }) => (
        <code className='bg-primary/5 text-primary px-2 py-0.5 rounded-lg text-[10px] font-mono font-black'>
          {row.original.code}
        </code>
      ),
    },
    {
      header: t('engineering.categoryArchive.columns.parent'),
      cell: ({ row }) => {
        const parent = row.original.parentId ? typeMap.get(row.original.parentId) : null

        return parent ? (
          <Badge variant='outline' className='text-[8px] h-4 px-2 font-black uppercase bg-primary/5 text-primary border-none rounded-full'>
            {parent.name}
          </Badge>
        ) : (
          <span className='text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest italic'>
            {t('engineering.categoryArchive.labels.rootLevel')}
          </span>
        )
      },
    },
    {
      accessorKey: 'active',
      header: t('engineering.categoryArchive.columns.status'),
      cell: ({ row }) => (
        <Badge
          variant={row.original.active ? 'outline' : 'secondary'}
          className={row.original.active ? 'text-green-600 border-green-200 bg-green-50' : ''}
        >
          {row.original.active
            ? t('engineering.categoryArchive.labels.active')
            : t('engineering.categoryArchive.labels.inactive')}
        </Badge>
      ),
    },
    {
      accessorKey: 'description',
      header: t('engineering.categoryArchive.columns.description'),
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground truncate max-w-[200px] inline-block'>
          {row.original.description || t('engineering.categoryArchive.labels.noDescription')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.categoryArchive.columns.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => {
              setCurrentRow(row.original)
              setOpen(true)
            }}
          >
            <Edit className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-destructive'
            onClick={async () => {
              const confirmed = window.confirm(t('engineering.categoryArchive.confirms.delete'))
              if (!confirmed) return

              const products = await productService.getProducts()
              const relatedCount = (products as Product[]).filter(
                (product) => product.typeId === row.original.id
              ).length

              if (relatedCount > 0) {
                toast.error(
                  t('engineering.categoryArchive.toasts.relatedProducts', {
                    count: relatedCount,
                  })
                )
                return
              }

              const childCategories = data.filter((type) => type.parentId === row.original.id)
              if (childCategories.length > 0) {
                toast.error(
                  t('engineering.categoryArchive.toasts.hasChildren', {
                    count: childCategories.length,
                  })
                )
                return
              }

              try {
                await productService.deleteProductType(row.original.id)
                window.dispatchEvent(new CustomEvent('xdfc_product_types_data_updated'))
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
            <Trash2 className='size-4' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleFormSubmit = async (formData: Partial<ProductType>) => {
    try {
      await productService.saveProductType(formData)
      window.dispatchEvent(new CustomEvent('xdfc_product_types_data_updated'))
      toast.success(t('engineering.categoryArchive.toasts.saveSuccess'))
      setOpen(false)
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
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Tags}
        title={t('engineering.categoryArchive.header.title')}
        description={t('engineering.categoryArchive.header.description')}
      />

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>
          {t('engineering.categoryArchive.stats.total', { count: displayData.length })}
        </div>
        <Button
          onClick={() => {
            setCurrentRow(undefined)
            setOpen(true)
          }}
          className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
        >
          <Plus className='mr-2 size-4' /> {t('engineering.categoryArchive.buttons.add')}
        </Button>
      </div>

      <div className='relative rounded-[32px] border border-dashed bg-muted/5 overflow-hidden shadow-inner'>
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
        <Table>
          <TableHeader className='bg-muted/30 h-14'>
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
                <TableRow key={row.id} className='h-16 group hover:bg-muted/30 transition-all border-b border-dashed border-muted/50'>
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

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <ProductTypeActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}

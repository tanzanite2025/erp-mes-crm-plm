'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { CornerDownRight, Edit, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { DataTablePagination } from '@/components/data-table'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
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
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { ProductTypeActionDialog } from '../components/product-type-action-dialog'
import { type ProductType } from '../data/schema'
import { useProductTypeWriteActions } from '../hooks/use-product-type-write-actions'
import { PRODUCT_TYPES_QUERY_KEY } from '../query-keys'
import { ProductTypeService, type SaveProductTypeInput } from '../services/product-type-service'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
  buildProductTypeMap,
} from '../utils/product-type-tree'

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '')
const logger = createLogger('ProductTypesMgmt')

export function ProductTypesMgmt() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<ProductType | undefined>(undefined)
  const { saveProductType, deleteProductType } = useProductTypeWriteActions()
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
  })
  const data = productTypesQuery.data
  const error = productTypesQuery.error

  useEffect(() => {
    if (!error) return
    logger.error('Failed to load product types', error)
  }, [error])

  const resolvedProductTypes = useMemo(() => {
    if (data) return data
    if (productTypesQuery.isPending) return [] as ProductType[]
    const error = productTypesQuery.error instanceof Error
      ? productTypesQuery.error
      : new Error('[CRITICAL] Product types are missing after load')
    failLoudly(error, 'ProductTypesMgmt.productTypes')
    throw error
  }, [data, productTypesQuery.error, productTypesQuery.isPending])

  const displayData = useMemo(() => buildOrderedProductTypes(resolvedProductTypes), [resolvedProductTypes])
  const hierarchyMetaMap = useMemo(() => buildProductTypeHierarchyMetaMap(resolvedProductTypes), [resolvedProductTypes])
  const typeMap = useMemo(() => buildProductTypeMap(resolvedProductTypes), [resolvedProductTypes])

  const resolveLevelLabel = (level: number) => {
    if (level <= 0) return t('engineering.categoryArchive.labels.level1')
    if (level === 1) return t('engineering.categoryArchive.labels.level2')
    return t('engineering.categoryArchive.labels.level3')
  }

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name',
      header: () => <div className='pl-6'>{t('engineering.categoryArchive.columns.name')}</div>,
      cell: ({ row }) => {
        const hierarchy = hierarchyMetaMap.get(row.original.id)
        const level = hierarchy?.level ?? (row.original.parentId ? 1 : 0)
        const isSub = level > 0
        const levelLabel = resolveLevelLabel(level)
        const isBaseModel = level >= 2

        return (
          <div className={cn('flex items-center gap-2', isSub ? 'pl-6' : 'pl-6')} style={{ paddingLeft: `calc(${level} * 24px + 24px)` }}>
            {isSub ? (
              <>
                <CornerDownRight className='size-3.5 text-primary/30 shrink-0' />
                <div className='flex min-w-0 items-center gap-2'>
                  <span className='font-bold text-sm tracking-tight text-muted-foreground'>{row.original.name}</span>
                  <Badge variant='outline' className='h-5 rounded-full border-dashed px-2 text-[8px] font-black uppercase tracking-wide'>
                    {levelLabel}
                  </Badge>
                  {isBaseModel ? (
                    <Badge variant='outline' className='h-5 rounded-full border-blue-200 bg-blue-50 px-2 text-[8px] font-black uppercase tracking-wide text-blue-700'>
                      {t('engineering.categoryArchive.labels.baseModel')}
                    </Badge>
                  ) : null}
                </div>
              </>
            ) : (
              <div className='flex min-w-0 items-center gap-2'>
                <span className='font-black text-sm tracking-tighter italic uppercase text-primary'>
                  {row.original.name}
                </span>
                <Badge variant='outline' className='h-5 rounded-full border-dashed px-2 text-[8px] font-black uppercase tracking-wide'>
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
        if (!row.original.parentId) {
          return (
            <span className='text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest italic'>
              {t('engineering.categoryArchive.labels.rootLevel')}
            </span>
          )
        }

        const parent = row.original.parentId ? typeMap.get(row.original.parentId) : null

        return parent ? (
          <Badge variant='outline' className='text-[8px] h-4 px-2 font-black uppercase bg-primary/5 text-primary border-none rounded-full'>
            {parent.name}
          </Badge>
        ) : (
          <span className='text-[9px] text-amber-700/80 font-black uppercase tracking-widest italic'>
            {t('engineering.categoryArchive.labels.orphanParent')}
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
            <Trash2 className='size-4' />
          </Button>
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data: displayData,
    columns,
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (productTypesQuery.isError) {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <IndustrialHeader
          icon={Tags}
          title={t('engineering.categoryArchive.header.title')}
          description={t('engineering.categoryArchive.header.description')}
        />
        <div className='rounded-[32px] border border-dashed border-destructive/30 bg-destructive/5 px-6 py-10 text-center text-sm font-black tracking-wide text-destructive'>
          {t('engineering.categoryArchive.toasts.loadFailed')}
        </div>
      </div>
    )
  }

  const handleFormSubmit = async (formData: SaveProductTypeInput) => {
    try {
      await saveProductType({ formData, currentRow })
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
      <IndustrialHeader
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
            {productTypesQuery.isPending ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground font-black uppercase tracking-widest text-[10px]'>
                  {t('engineering.categoryArchive.empty.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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

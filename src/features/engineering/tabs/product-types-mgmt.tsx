'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flexRender, type ColumnDef } from '@tanstack/react-table'
import { CornerDownRight, Edit, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
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
import { DataTablePagination } from '@/components/data-table'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { ProductTypeActionDialog } from '../components/product-type-action-dialog'
import { type ProductType } from '../data/schema'
import { useProductTypeWriteActions } from '../hooks/use-product-type-write-actions'
import { PRODUCT_TYPES_QUERY_KEY } from '../query-keys'
import {
  ProductTypeService,
  type SaveProductTypeInput,
} from '../services/product-type-service'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
  buildProductTypeMap,
} from '../utils/product-type-tree'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : ''
const logger = createLogger('ProductTypesMgmt')

export function ProductTypesMgmt() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<ProductType | undefined>(
    undefined
  )
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
    const error =
      productTypesQuery.error instanceof Error
        ? productTypesQuery.error
        : new Error('[CRITICAL] Product types are missing after load')
    failLoudly(error, 'ProductTypesMgmt.productTypes')
    throw error
  }, [data, productTypesQuery.error, productTypesQuery.isPending])

  const displayData = useMemo(
    () => buildOrderedProductTypes(resolvedProductTypes),
    [resolvedProductTypes]
  )
  const hierarchyMetaMap = useMemo(
    () => buildProductTypeHierarchyMetaMap(resolvedProductTypes),
    [resolvedProductTypes]
  )
  const typeMap = useMemo(
    () => buildProductTypeMap(resolvedProductTypes),
    [resolvedProductTypes]
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
        <div className='pl-6'>
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
            className={cn('flex items-center gap-2', isSub ? 'pl-6' : 'pl-6')}
            style={{ paddingLeft: `calc(${level} * 24px + 24px)` }}
          >
            {isSub ? (
              <>
                <CornerDownRight className='size-3.5 shrink-0 text-primary/30' />
                <div className='flex min-w-0 items-center gap-2'>
                  <span className='text-sm font-bold tracking-tight text-muted-foreground'>
                    {row.original.name}
                  </span>
                  <Badge
                    variant='outline'
                    className='h-5 rounded-full border-dashed px-2 text-[8px] font-black tracking-wide uppercase'
                  >
                    {levelLabel}
                  </Badge>
                  {isBaseModel ? (
                    <Badge
                      variant='outline'
                      className='h-5 rounded-full border-blue-200 bg-blue-50 px-2 text-[8px] font-black tracking-wide text-blue-700 uppercase'
                    >
                      {t('engineering.categoryArchive.labels.baseModel')}
                    </Badge>
                  ) : null}
                </div>
              </>
            ) : (
              <div className='flex min-w-0 items-center gap-2'>
                <span className='text-sm font-black tracking-tighter text-primary uppercase italic'>
                  {row.original.name}
                </span>
                <Badge
                  variant='outline'
                  className='h-5 rounded-full border-dashed px-2 text-[8px] font-black tracking-wide uppercase'
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
      header: t('engineering.categoryArchive.columns.code'),
      cell: ({ row }) => (
        <code className='rounded-lg bg-primary/5 px-2 py-0.5 font-mono text-[10px] font-black text-primary'>
          {row.original.code}
        </code>
      ),
    },
    {
      header: t('engineering.categoryArchive.columns.parent'),
      cell: ({ row }) => {
        if (!row.original.parentId) {
          return (
            <span className='text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
              {t('engineering.categoryArchive.labels.rootLevel')}
            </span>
          )
        }

        const parent = row.original.parentId
          ? typeMap.get(row.original.parentId)
          : null

        return parent ? (
          <Badge
            variant='outline'
            className='h-4 rounded-full border-none bg-primary/5 px-2 text-[8px] font-black text-primary uppercase'
          >
            {parent.name}
          </Badge>
        ) : (
          <span className='text-[9px] font-black tracking-widest text-amber-700/80 uppercase italic'>
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
          className={
            row.original.active
              ? 'border-green-200 bg-green-50 text-green-600'
              : ''
          }
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
        <span className='inline-block max-w-[200px] truncate text-xs text-muted-foreground'>
          {row.original.description ||
            t('engineering.categoryArchive.labels.noDescription')}
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
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Tags}
        title={t('engineering.categoryArchive.header.title')}
        description={t('engineering.categoryArchive.header.description')}
      />

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
          {t('engineering.categoryArchive.stats.total', {
            count: displayData.length,
          })}
        </div>
        <Button
          onClick={() => {
            setCurrentRow(undefined)
            setOpen(true)
          }}
          className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
        >
          <Plus className='mr-2 size-4' />{' '}
          {t('engineering.categoryArchive.buttons.add')}
        </Button>
      </div>

      <div className='relative overflow-hidden rounded-[32px] border border-dashed bg-muted/5 shadow-inner'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
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
            {productTypesQuery.isPending ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase'
                >
                  {t('engineering.categoryArchive.empty.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='group h-16 border-b border-dashed border-muted/50 transition-all hover:bg-muted/30'
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

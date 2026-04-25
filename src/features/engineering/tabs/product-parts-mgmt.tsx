'use client'

import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Box, Plus, Settings2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { DataTablePagination } from '@/components/data-table'
import { SegmentedTabs } from '@/components/segmented-tabs'
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
import { cn } from '@/lib/utils'
import { CategoryManagerDialog } from '../components/category-manager-dialog'
import { ProductActionDialog } from '../components/product-action-dialog'
import { type Product } from '../data/schema'
import { useProductMgmt } from '../hooks/use-product-mgmt'
import { useProductColumns } from '../hooks/use-product-columns'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'

export function ProductPartsMgmt() {
  const { t } = useLanguage()
  const {
    productTypes,
    isLoading,
    activeTab,
    setActiveTab,
    activeSubTab,
    setActiveSubTab,
    topLevelTypes,
    subLevelTypes,
    filteredProducts,
    handleFormSubmit,
    handleDeleteProduct,
    refresh
  } = useProductMgmt(t)

  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Product | undefined>(undefined)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)

  const columns = useProductColumns(
    t,
    productTypes,
    (product) => {
      setCurrentRow(product)
      setOpen(true)
    },
    handleDeleteProduct
  )

  const table = useReactTable({
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader 
        icon={Box}
        title={t('engineering.productArchive.header.title')}
        description={t('engineering.productArchive.header.description')}
      />

      <IndustrialActionBar 
        onRefresh={refresh}
        isRefreshing={isLoading}
        leftContent={
          <SegmentedTabs
            tabs={[
              {
                value: 'all',
                label: t('engineering.productArchive.filters.allCategories'),
              },
              ...topLevelTypes.map((type) => ({
                value: type.id,
                label: type.name,
              })),
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
            listClassName='border-none h-12 gap-2 bg-transparent p-0'
          />
        }
        rightContent={
          <Button
            onClick={() => {
              setCurrentRow(undefined)
              setOpen(true)
            }}
            className='bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all hover:scale-105 active:scale-95'
          >
            <Plus className='size-4' /> {t('engineering.productArchive.buttons.add')}
          </Button>
        }
      />

      <div className='flex gap-6 min-h-[500px]'>
        {/* 子分类侧边栏 */}
        <div className='w-44 shrink-0 flex flex-col gap-1 pr-4 border-r border-slate-100'>
          <div className='px-2 mb-4 flex items-center justify-between'>
            <h4 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
              {t('engineering.productArchive.filters.subcategoryFilter')}
            </h4>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-1.5 text-[10px] text-blue-600 hover:bg-blue-50 gap-1'
              onClick={() => setTypeDialogOpen(true)}
            >
              <Settings2 className='size-3' />
              {t('engineering.productArchive.filters.manageCategories')}
            </Button>
          </div>
          <button
            onClick={() => setActiveSubTab('all')}
            className={cn(
              'flex items-center px-3 py-2 text-xs rounded-md transition-all text-left group',
              activeSubTab === 'all'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            <span className={cn('size-1.5 rounded-full mr-2 shrink-0', activeSubTab === 'all' ? 'bg-blue-600' : 'bg-slate-300')} />
            {t('engineering.productArchive.filters.allSubcategories')}
          </button>
          {subLevelTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveSubTab(type.id)}
              className={cn(
                'flex items-center px-3 py-2 text-xs rounded-md transition-all text-left group',
                activeSubTab === type.id
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              <span className={cn('size-1.5 rounded-full mr-2 shrink-0', activeSubTab === type.id ? 'bg-blue-600' : 'bg-slate-300 opacity-40 group-hover:opacity-100')} />
              {type.name}
            </button>
          ))}
          {activeTab !== 'all' && subLevelTypes.length === 0 && (
            <div className='px-3 py-10 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200'>
              <p className='text-[10px] text-slate-400 italic leading-relaxed'>
                {t('engineering.productArchive.filters.noSubcategories')}
              </p>
            </div>
          )}
        </div>

        {/* 主数据表格 */}
        <div className='flex-1 min-w-0'>
          <Card className='shadow-none border-slate-200 overflow-hidden rounded-xl'>
            <CardContent className='p-0'>
              <div className='rounded-none border-none'>
                <Table>
                  <TableHeader className='bg-slate-50/80 sticky top-0 z-10'>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-slate-100'>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className='text-slate-500 text-[11px] font-bold py-3 uppercase tracking-wider'>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className='divide-y divide-slate-50'>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className='h-48 text-center'>
                          <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                            <RefreshCw className='size-6 animate-spin' />
                            <span className='text-xs'>{t('engineering.productArchive.states.loading')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className='hover:bg-blue-50/10 transition-colors group'>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className='py-4'>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className='h-48 text-center text-slate-400 italic text-xs'>
                          {t('engineering.productArchive.states.empty')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className='mt-5'>
            <DataTablePagination table={table} />
          </div>
        </div>
      </div>

      <ProductActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSubmit={handleFormSubmit}
        productTypes={productTypes}
      />

      <CategoryManagerDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        productTypes={productTypes}
      />
    </div>
  )
}

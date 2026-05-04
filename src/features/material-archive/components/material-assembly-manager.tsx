'use client'

import { 
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowRightLeft,
  Plus,
  Search,
} from 'lucide-react'
import { DataTablePagination } from '@/components/data-table/pagination'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { useMaterialAssemblyColumns } from '../hooks/use-material-assembly-columns'
import { useMaterialAssemblyManager } from '../hooks/use-material-assembly-manager'
import { MaterialAssemblyRuleDialog } from './material-assembly-rule-dialog'

export function MaterialAssemblyManager() {
  const { t } = useLanguage()
  const {
    searchTerm,
    setSearchTerm,
    isDialogOpen,
    isComboboxOpen,
    setIsComboboxOpen,
    editingRule,
    selectedMaterial,
    materialOptions,
    isLoading,
    filteredRows,
    handleDialogOpenChange,
    handleOpenCreate,
    handleOpenEdit,
    handleSelectMaterial,
    handleDraftFieldChange,
    handleFactorChange,
    handleToggleDirection,
    handleSave,
    handleDelete,
    isSaving,
  } = useMaterialAssemblyManager()

  const columns = useMaterialAssemblyColumns({
    onEdit: handleOpenEdit,
    onDelete: handleDelete,
  })

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  return (
    <div className='flex flex-col gap-8 px-4 pb-6 pt-0 md:px-6 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={ArrowRightLeft}
        title={t('materialArchive.assemblyManager.title')}
        description={t('materialArchive.assemblyManager.description')}
      />

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('materialArchive.assemblyManager.searchPlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium shadow-inner transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <Button
          onClick={handleOpenCreate}
          className='h-11 rounded-full bg-primary px-6 text-[10px] font-black tracking-widest text-primary-foreground shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-primary/90'
        >
          <Plus className='mr-2 size-4' />
          {t('materialArchive.assemblyManager.addRule')}
        </Button>
      </div>

      <div className='relative shrink-0 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <Table>
          <TableHeader className='h-14 bg-muted/30'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='border-b border-dashed border-muted/50 hover:bg-transparent'
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='p-0 align-middle'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground'>
                  {isLoading
                    ? t('materialArchive.assemblyManager.emptyLoading')
                    : t('materialArchive.assemblyManager.emptyState')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='group h-16 border-b border-dashed border-muted/50 transition-all hover:bg-muted/30'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='p-0 align-middle'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <MaterialAssemblyRuleDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        isComboboxOpen={isComboboxOpen}
        onComboboxOpenChange={setIsComboboxOpen}
        editingRule={editingRule}
        selectedMaterial={selectedMaterial}
        materialOptions={materialOptions}
        onSelectMaterial={handleSelectMaterial}
        onPackUnitChange={(value) => handleDraftFieldChange('packUnit', value)}
        onFactorChange={handleFactorChange}
        onToggleDirection={handleToggleDirection}
        onCancel={() => handleDialogOpenChange(false)}
        onConfirm={() => {
          void handleSave()
        }}
        isSubmitting={isSaving}
      />
    </div>
  )
}

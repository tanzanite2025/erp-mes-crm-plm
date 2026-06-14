import { useMemo } from 'react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { useUdsManualPaginationTable } from '@/hooks/use-uds-table'
import { DataTablePagination } from '@/components/data-table/pagination'
import { ForbiddenState } from '@/components/forbidden-state'
import { MaterialMobileList } from '../components/material-mobile-list'
import { MaterialTable } from '../components/material-table'
import { MaterialToolbar } from '../components/material-toolbar'
import { MaterialUpsertDialog } from '../components/material-upsert-dialog'
import { getMaterialCategoryOptions } from '../data/material-category-options'
import { type MaterialCategory, materialCategoryLabels } from '../data/schema'
import { useMaterialColumns } from '../hooks/use-material-columns'
import { useMaterialMgmtActions } from '../hooks/use-material-mgmt-actions'
import { useMaterialMgmtData } from '../hooks/use-material-mgmt-data'
import { resolveCurrentCategoryLabel } from '../utils/material-mgmt-utils'

interface MaterialMgmtProps {
  category?: MaterialCategory
}

export function MaterialMgmt({ category }: MaterialMgmtProps) {
  const { t, locale } = useLanguage()
  const {
    queryClient,
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    error,
    isLoading,
    filteredMaterials,
    totalCount,
    upsertMutation,
    deleteMutation,
  } = useMaterialMgmtData({ category })

  // Resolve category label from module-owned category options.
  const currentCategoryLabel = useMemo(() => {
    const options = getMaterialCategoryOptions(locale)
    return resolveCurrentCategoryLabel(
      category,
      options,
      materialCategoryLabels,
      t('materialArchive.layout.tabs.all'),
      t('materialArchive.columns.unknownCategory')
    )
  }, [category, locale, t])

  const {
    isDialogOpen,
    setIsDialogOpen,
    editingMaterial,
    handleAdd,
    handleEdit,
    handleDelete,
    handleExport,
    handleImport,
  } = useMaterialMgmtActions({
    currentCategoryLabel,
    filteredMaterials,
    queryClient,
    onDelete: (id: string) => deleteMutation.mutate(id),
  })

  const columns = useMaterialColumns({
    category,
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  const table = useUdsManualPaginationTable({
    data: filteredMaterials,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in md:gap-8'>
      <MaterialToolbar
        currentCategoryLabel={currentCategoryLabel}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onExport={handleExport}
        onImport={handleImport}
        onAdd={handleAdd}
      />

      <MaterialTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        materialsCount={filteredMaterials.length}
        currentCategoryLabel={currentCategoryLabel}
        onEdit={handleEdit}
      />

      <MaterialMobileList
        isLoading={isLoading}
        materials={filteredMaterials}
        onEdit={handleEdit}
      />

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <MaterialUpsertDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        material={editingMaterial}
        defaultCategory={category !== 'all' ? category : undefined}
        onSave={async (data, isPatch, delta) => {
          await upsertMutation.mutateAsync({ data, isPatch, delta })
        }}
      />
    </div>
  )
}

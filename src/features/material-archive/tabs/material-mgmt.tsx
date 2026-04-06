import { useMemo } from 'react'
import {
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import { ForbiddenState } from '@/components/forbidden-state'
import { DataTablePagination } from '@/components/data-table/pagination'
import { isForbiddenError } from '@/lib/error-status'
import { MaterialUpsertDialog } from '../components/material-upsert-dialog'
import { type MaterialCategory, materialCategoryLabels } from '../data/schema'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { resolveCurrentCategoryLabel } from '../utils/material-mgmt-utils'
import { useMaterialMgmtActions } from '../hooks/use-material-mgmt-actions'
import { useMaterialMgmtData } from '../hooks/use-material-mgmt-data'
import { useMaterialColumns } from '../hooks/use-material-columns'
import { MaterialToolbar } from '../components/material-toolbar'
import { MaterialTable } from '../components/material-table'
import { MaterialMobileList } from '../components/material-mobile-list'

interface MaterialMgmtProps {
    category?: MaterialCategory;
}

export function MaterialMgmt({ category }: MaterialMgmtProps) {
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
        deleteMutation
    } = useMaterialMgmtData({ category })

    // 动态获取分类标签
    const currentCategoryLabel = useMemo(() => {
        const options = dictionaryService.getOptions('MATERIAL_CATEGORY')
        return resolveCurrentCategoryLabel(category, options, materialCategoryLabels)
    }, [category])

    const {
        isDialogOpen,
        setIsDialogOpen,
        editingMaterial,
        handleAdd,
        handleEdit,
        handleDelete,
        handleExport,
        handleImport
    } = useMaterialMgmtActions({
        currentCategoryLabel,
        filteredMaterials,
        queryClient,
        onDelete: (id: string) => deleteMutation.mutate(id)
    })

    const columns = useMaterialColumns({
        category,
        onEdit: handleEdit,
        onDelete: handleDelete
    })

    const table = useReactTable({
        data: filteredMaterials,
        columns,
        pageCount: Math.ceil(totalCount / pagination.pageSize),
        state: { pagination },
        onPaginationChange: setPagination,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
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
                onSave={async (data) => { await upsertMutation.mutateAsync(data) }}
            />
        </div>
    )
}

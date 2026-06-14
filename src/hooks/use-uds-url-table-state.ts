import { useState } from 'react'
import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
  TableState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  type NavigateFn,
  type SearchRecord,
  type UseTableUrlStateParams,
  useTableUrlState,
} from './use-table-url-state'

export interface UseUdsUrlTableStateParams {
  search: SearchRecord
  navigate: NavigateFn
  pagination?: UseTableUrlStateParams['pagination']
  globalFilter?: UseTableUrlStateParams['globalFilter']
  columnFilters?: UseTableUrlStateParams['columnFilters']
  initialSorting?: SortingState
  initialRowSelection?: RowSelectionState
  initialColumnVisibility?: VisibilityState
}

export interface UseUdsUrlTableStateReturn {
  tableState: Pick<
    TableState,
    | 'sorting'
    | 'pagination'
    | 'rowSelection'
    | 'columnFilters'
    | 'columnVisibility'
    | 'globalFilter'
  >
  tableHandlers: {
    onPaginationChange: OnChangeFn<PaginationState>
    onGlobalFilterChange?: OnChangeFn<TableState['globalFilter']>
    onSortingChange: OnChangeFn<SortingState>
    onColumnFiltersChange: OnChangeFn<ColumnFiltersState>
    onRowSelectionChange: OnChangeFn<RowSelectionState>
    onColumnVisibilityChange: OnChangeFn<VisibilityState>
  }
  ensurePageInRange: (
    pageCount: number,
    opts?: { resetTo?: 'first' | 'last' }
  ) => void
}

export function useUdsUrlTableState({
  search,
  navigate,
  pagination,
  globalFilter,
  columnFilters,
  initialSorting = [],
  initialRowSelection = {},
  initialColumnVisibility = {},
}: UseUdsUrlTableStateParams): UseUdsUrlTableStateReturn {
  const {
    globalFilter: urlGlobalFilter,
    onGlobalFilterChange,
    columnFilters: urlColumnFilters,
    onColumnFiltersChange,
    pagination: urlPagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination,
    globalFilter,
    columnFilters,
  })

  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [rowSelection, setRowSelection] =
    useState<RowSelectionState>(initialRowSelection)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility
  )

  return {
    tableState: {
      sorting,
      pagination: urlPagination,
      rowSelection,
      columnFilters: urlColumnFilters,
      columnVisibility,
      globalFilter: urlGlobalFilter,
    },
    tableHandlers: {
      onPaginationChange,
      onGlobalFilterChange,
      onSortingChange: setSorting,
      onColumnFiltersChange,
      onRowSelectionChange: setRowSelection,
      onColumnVisibilityChange: setColumnVisibility,
    },
    ensurePageInRange,
  }
}

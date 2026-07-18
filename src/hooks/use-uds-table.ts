import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type InitialTableState,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Table,
  type TableMeta,
  type TableState,
  type VisibilityState,
  type TableOptions,
  useReactTable,
} from '@tanstack/react-table'

export type UdsTableMode = 'client' | 'manual-pagination' | 'manual-table'

export interface UseUdsTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  mode?: UdsTableMode
  state?: Partial<TableState>
  initialState?: InitialTableState
  pageCount?: number
  rowCount?: number
  enableRowSelection?: TableOptions<TData>['enableRowSelection']
  enableSorting?: boolean
  enableFiltering?: boolean
  enableFaceting?: boolean
  meta?: TableMeta<TData>
  onPaginationChange?: OnChangeFn<PaginationState>
  onGlobalFilterChange?: OnChangeFn<TableState['globalFilter']>
  onSortingChange?: OnChangeFn<SortingState>
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  getColumnCanGlobalFilter?: TableOptions<TData>['getColumnCanGlobalFilter']
  getRowId?: TableOptions<TData>['getRowId']
}

export type UseUdsClientTableOptions<TData> = Omit<
  UseUdsTableOptions<TData>,
  'mode'
>

export type UseUdsManualPaginationTableOptions<TData> = Omit<
  UseUdsTableOptions<TData>,
  'mode'
>

export function useUdsTable<TData>({
  data,
  columns,
  mode = 'client',
  state,
  initialState,
  pageCount,
  rowCount,
  enableRowSelection,
  enableSorting = true,
  enableFiltering = false,
  enableFaceting = false,
  meta,
  onPaginationChange,
  onGlobalFilterChange,
  onSortingChange,
  onColumnFiltersChange,
  onRowSelectionChange,
  onColumnVisibilityChange,
  getColumnCanGlobalFilter,
  getRowId,
}: UseUdsTableOptions<TData>): Table<TData> {
  const shouldUseClientPagination = mode === 'client'
  const shouldUseManualPagination =
    mode === 'manual-pagination' || mode === 'manual-table'

  return useReactTable({
    data,
    columns,
    state,
    initialState,
    pageCount,
    rowCount,
    meta,
    manualPagination: shouldUseManualPagination,
    enableRowSelection,
    onPaginationChange,
    onGlobalFilterChange,
    onSortingChange,
    onColumnFiltersChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
    getColumnCanGlobalFilter,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: shouldUseClientPagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getFacetedRowModel: enableFaceting ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enableFaceting
      ? getFacetedUniqueValues()
      : undefined,
  })
}

export function useUdsClientTable<TData>({
  enableSorting = true,
  ...options
}: UseUdsClientTableOptions<TData>): Table<TData> {
  return useUdsTable({
    ...options,
    mode: 'client',
    enableSorting,
  })
}

export function useUdsManualPaginationTable<TData>(
  options: UseUdsManualPaginationTableOptions<TData>
): Table<TData> {
  return useUdsTable({
    ...options,
    mode: 'manual-pagination',
  })
}

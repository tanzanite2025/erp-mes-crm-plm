import {
  type ReactNode,
  useEffect,
  useMemo,
} from 'react'
import {
  flexRender,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { useUdsManualPaginationTable } from '@/hooks/use-uds-table'
import { useUdsUrlTableState } from '@/hooks/use-uds-url-table-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getUsersColumns, type UsersTableMode } from './users-columns'
import { useLanguage } from '@/context/language-provider'

type DataTableProps = {
  data: User[]
  total: number
  search: Record<string, unknown>
  navigate: NavigateFn
  isLoading?: boolean
  mode?: UsersTableMode
  showBulkActions?: boolean
  showSelection?: boolean
  leadingViewSlot?: ReactNode
}

export function UsersTable({
  data,
  total,
  search,
  navigate,
  isLoading,
  mode = 'management',
  showBulkActions = true,
  showSelection = true,
  leadingViewSlot,
}: DataTableProps) {
  const { t } = useLanguage()

  const columns = useMemo(
    () => getUsersColumns(t, mode, showSelection),
    [mode, showSelection, t],
  )

  const {
    tableState,
    tableHandlers,
    ensurePageInRange,
  } = useUdsUrlTableState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'username', searchKey: 'username', type: 'string' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
    ],
  })

  const table = useUdsManualPaginationTable({
    data,
    columns,
    enableSorting: true,
    enableFiltering: true,
    enableFaceting: true,
    rowCount: total,
    state: tableState,
    enableRowSelection: showSelection,
    ...tableHandlers,
  })

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  return (
    <div className={cn('flex flex-1 flex-col gap-6')}>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('users.table.searchPlaceholder')}
        searchKey='username'
        leadingViewSlot={leadingViewSlot}
        filters={[
          {
            columnId: 'status',
            title: t('users.table.filters.status'),
            options: [
              { label: t('users.status.active'), value: 'active' },
              { label: t('users.status.inactive'), value: 'inactive' },
              { label: t('users.status.suspended'), value: 'suspended' },
            ],
            triggerClassName:
              'h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95',
          },
        ]}
      />
      <Card className='rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50 p-1 overflow-hidden'>
        <div className='bg-background/50 rounded-[20px] overflow-x-auto scrollbar-thin'>
          <Table className='min-w-[1000px]'>
            <TableHeader className='bg-muted/50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='hover:bg-transparent border-none'>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 py-0',
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName
                      )}
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center text-[10px] font-black uppercase tracking-widest opacity-30 text-muted-foreground'
                  >
                    {t('users.table.syncing')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='border-muted/20 hover:bg-muted/30 transition-colors'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'py-3 text-xs font-medium',
                          cell.column.columnDef.meta?.className,
                          cell.column.columnDef.meta?.tdClassName
                        )}
                      >
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
                    className='h-24 text-center text-[10px] font-black uppercase tracking-widest opacity-30 text-muted-foreground'
                  >
                    {t('users.table.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <DataTablePagination table={table} className='mt-auto' />
      {showBulkActions ? <DataTableBulkActions table={table} /> : null}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { roles as staticRoles } from '../data/data'
import { type User } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getUsersColumns } from './users-columns'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { useLanguage } from '@/context/language-provider'
import { OrgService } from '@/features/org-personnel/services/org-service'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'

type DataTableProps = {
  data: User[]
  total: number
  search: Record<string, unknown>
  navigate: NavigateFn
  isLoading?: boolean
}

export function UsersTable({ data, total, search, navigate, isLoading }: DataTableProps) {
  const { t, locale } = useLanguage()
  const { roles: dynamicRoles } = useRoles()
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([])

  // 加载组织架构树以支持部门名解析
  useEffect(() => {
    OrgService.getOrgTree().then((data) => {
      if (data) setOrgNodes(data)
    })
  }, [])

  // Local UI-only states
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const roleColumnLabels = useMemo(
    () =>
      locale === 'zh-CN'
        ? {
            title: '所属角色',
            driftTooltip:
              '注意：账号访问范围由后端按角色与部门关系裁决。当前存储角色标识为 {{original}}，部门解析角色为 {{resolved}}',
            invalid: '部门角色未匹配',
          }
        : {
            title: 'Assigned Role',
            driftTooltip:
              'Note: Access is enforced by the backend from role and department mapping. Stored role marker: {{original}}, resolved department role: {{resolved}}',
            invalid: 'Department Role Missing',
          },
    [locale],
  )

  const columns = useMemo(
    () => getUsersColumns(t, dynamicRoles, roleColumnLabels, orgNodes),
    [dynamicRoles, roleColumnLabels, t, orgNodes],
  )

  // Synced with URL states (keys/defaults mirror users route search schema)
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'username', searchKey: 'username', type: 'string' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'role', searchKey: 'role', type: 'array' },
    ],
  })

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    rowCount: total,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
        filters={[
          {
            columnId: 'status',
            title: t('users.table.filters.status'),
            options: [
              { label: t('users.status.active'), value: 'active' },
              { label: t('users.status.inactive'), value: 'inactive' },
              { label: t('users.status.suspended'), value: 'suspended' },
            ],
          },
          {
            columnId: 'role',
            title: t('users.table.filters.role'),
            options: dynamicRoles.map((role) => ({
              label: role.label,
              value: role.id,
              icon: staticRoles.find(r => r.value === role.id)?.icon
            })),
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
      <DataTableBulkActions table={table} />
    </div>
  )
}

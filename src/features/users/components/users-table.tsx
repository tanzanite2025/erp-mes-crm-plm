import { type ReactNode, useEffect, useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import { ShieldAlert, ShieldPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { useUdsManualPaginationTable } from '@/hooks/use-uds-table'
import { useUdsUrlTableState } from '@/hooks/use-uds-url-table-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { PermissionBoundary } from '@/components/permission-boundary'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { callTypes } from '../data/data'
import { type User, type UserStatus } from '../data/schema'
import { isProtectedSystemAccount } from '../utils/user-utils'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getUsersColumns, type UsersTableMode } from './users-columns'
import { useUsers } from './users-provider'

const permissionUserStatusTranslationKeys: Record<
  UserStatus,
  'users.status.active' | 'users.status.inactive' | 'users.status.suspended'
> = {
  active: 'users.status.active',
  inactive: 'users.status.inactive',
  suspended: 'users.status.suspended',
}

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
  const { setCurrentRow, setOpen } = useUsers()
  const isPermissionsMode = mode === 'permissions'
  const currentUserID = useAuthStore((state) => state.user?.id || '')
  const { allowsPermission } = usePermissionActions()
  const selectionEnabled =
    showSelection &&
    allowsPermission(isPermissionsMode ? 'perm_manage' : 'user_delete')

  const columns = useMemo(
    () => getUsersColumns(t, mode, selectionEnabled),
    [mode, selectionEnabled, t]
  )

  const { tableState, tableHandlers, ensurePageInRange } = useUdsUrlTableState({
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
    enableRowSelection: selectionEnabled
      ? (row) =>
          !isProtectedSystemAccount(row.original) &&
          (isPermissionsMode || row.original.id !== currentUserID)
      : false,
    getRowId: (row) => row.id,
    ...tableHandlers,
  })

  const selectedRowIds = Object.keys(tableState.rowSelection).filter(
    (rowId) => tableState.rowSelection[rowId]
  )
  const selectedPermissionUser =
    isPermissionsMode && selectedRowIds.length === 1
      ? (data.find((user) => user.id === selectedRowIds[0]) ?? null)
      : null
  const selectedPermissionUserIsProtected = selectedPermissionUser
    ? isProtectedSystemAccount(selectedPermissionUser)
    : false

  const toolbarFilters = [
    {
      columnId: 'status',
      title: t('users.table.filters.status'),
      options: [
        { label: t('users.status.active'), value: 'active' },
        { label: t('users.status.inactive'), value: 'inactive' },
        { label: t('users.status.suspended'), value: 'suspended' },
      ],
      triggerClassName: isPermissionsMode
        ? 'h-11 w-full justify-center rounded-full px-3 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 md:h-9 md:w-auto md:px-4'
        : 'h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95',
    },
  ]
  const isToolbarFiltered =
    table.getState().columnFilters.length > 0 ||
    Boolean(table.getState().globalFilter)
  const usernameColumn = table.getColumn('username')
  const statusColumn = table.getColumn('status')

  const setPermissionRowSelection = (rowId: string, checked: boolean) => {
    table.setRowSelection(checked ? { [rowId]: true } : {})
  }

  const togglePermissionRowSelection = (rowId: string, isSelected: boolean) => {
    setPermissionRowSelection(rowId, !isSelected)
  }

  const permissionActionButtons = isPermissionsMode ? (
    <>
      <PermissionBoundary permission='perm_manage'>
        <Button
          type='button'
          variant='outline'
          disabled={
            !selectedPermissionUser || selectedPermissionUserIsProtected
          }
          onClick={() => {
            if (!selectedPermissionUser || selectedPermissionUserIsProtected)
              return

            setCurrentRow(selectedPermissionUser)
            setOpen('permissions')
          }}
          className='h-11 w-full justify-center rounded-full px-3 text-[10px] font-black tracking-widest uppercase shadow-sm transition-all active:scale-95 md:h-9 md:w-auto md:px-4'
        >
          <ShieldPlus className='mr-2 size-3.5' />
          {t('users.actions.managePermissions')}
        </Button>
      </PermissionBoundary>
      {leadingViewSlot}
    </>
  ) : null

  const toolbarLeadingSlot = isPermissionsMode ? (
    <div className='flex flex-wrap items-center gap-2'>
      {permissionActionButtons}
    </div>
  ) : (
    leadingViewSlot
  )

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  return (
    <div className={cn('flex flex-1 flex-col gap-6')}>
      {isPermissionsMode ? (
        <>
          <div className='flex flex-col gap-2.5 md:hidden'>
            <Input
              placeholder={t('users.table.searchPlaceholder')}
              value={(usernameColumn?.getFilterValue() as string) ?? ''}
              onChange={(event) => {
                usernameColumn?.setFilterValue(event.target.value)
              }}
              className='h-12 w-full rounded-2xl border-none bg-muted/50 px-4 text-sm font-medium shadow-sm placeholder:text-muted-foreground/35'
            />
            <div className='grid grid-cols-3 gap-2'>
              {statusColumn ? (
                <DataTableFacetedFilter
                  column={statusColumn}
                  title={toolbarFilters[0].title}
                  options={toolbarFilters[0].options}
                  triggerClassName={toolbarFilters[0].triggerClassName}
                />
              ) : null}
              {permissionActionButtons}
            </div>
            {isToolbarFiltered ? (
              <Button
                type='button'
                variant='ghost'
                onClick={() => {
                  table.resetColumnFilters()
                  table.setGlobalFilter('')
                }}
                className='h-9 self-start rounded-full px-3 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
              >
                {t('common.actions.reset')}
              </Button>
            ) : null}
          </div>
          <div className='hidden md:block'>
            <DataTableToolbar
              table={table}
              searchPlaceholder={t('users.table.searchPlaceholder')}
              searchKey='username'
              leadingViewSlot={toolbarLeadingSlot}
              filters={toolbarFilters}
            />
          </div>
        </>
      ) : (
        <DataTableToolbar
          table={table}
          searchPlaceholder={t('users.table.searchPlaceholder')}
          searchKey='username'
          leadingViewSlot={toolbarLeadingSlot}
          filters={toolbarFilters}
        />
      )}
      {isPermissionsMode ? (
        <div className='space-y-3 md:hidden'>
          {isLoading ? (
            <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-5 shadow-inner'>
              <div className='flex min-h-24 items-center justify-center text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-30'>
                {t('users.table.syncing')}
              </div>
            </Card>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const user = row.original
              const isSelected = row.getIsSelected()
              const isProtected = isProtectedSystemAccount(user)
              const canSelect = row.getCanSelect()
              const fullName =
                `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'
              const permissionPresetId =
                String(user.permissionPresetId || '').trim() || 'UNASSIGNED'
              const phoneNumber = String(user.phoneNumber || '').trim() || '-'
              const statusLabel = t(
                permissionUserStatusTranslationKeys[user.status]
              )
              const statusTone = callTypes.get(user.status)

              return (
                <Card
                  key={row.id}
                  data-state={isSelected && 'selected'}
                  className={cn(
                    'rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-3 shadow-inner transition-all active:scale-[0.99]',
                    isSelected &&
                      'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  )}
                >
                  <div
                    className='flex cursor-pointer flex-col gap-3'
                    onClick={() => {
                      if (!canSelect) return
                      togglePermissionRowSelection(row.id, isSelected)
                    }}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex min-w-0 items-start gap-3'>
                        <Checkbox
                          checked={isSelected}
                          disabled={!canSelect}
                          onCheckedChange={(value) => {
                            if (!canSelect) return
                            setPermissionRowSelection(row.id, value === true)
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation()
                          }}
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                          className='mt-0.5 size-5 shrink-0 rounded-[6px]'
                          aria-label={t('users.actions.managePermissions')}
                        />
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-black tracking-tighter text-foreground italic'>
                              {user.username || '-'}
                            </p>
                            {isProtected ? (
                              <ShieldAlert className='size-3.5 shrink-0 text-amber-500' />
                            ) : null}
                          </div>
                          <p className='mt-1 text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                            {t('users.columns.username')}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-6 shrink-0 rounded-full border-dashed px-2.5 text-[9px] font-black tracking-widest uppercase',
                          statusTone
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_auto] items-center gap-2 rounded-[18px] border border-dashed border-muted/40 bg-background/70 px-2.5 py-1.5'>
                      <div className='flex min-w-0 items-center gap-1'>
                        <p className='shrink-0 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                          {t('users.columns.name')}
                        </p>
                        <p className='truncate text-[11px] font-bold text-foreground'>
                          {fullName}
                        </p>
                      </div>

                      <div className='flex min-w-0 items-center gap-1'>
                        <p className='shrink-0 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                          {t('users.columns.phone')}
                        </p>
                        <p className='truncate text-[11px] font-bold text-foreground'>
                          {phoneNumber}
                        </p>
                      </div>

                      <div className='flex min-w-0 items-center gap-1'>
                        <p className='shrink-0 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                          {t('users.columns.permissionPreset')}
                        </p>
                        <p className='truncate text-[10px] font-black tracking-widest text-foreground/75 uppercase'>
                          {permissionPresetId}
                        </p>
                      </div>

                      {isSelected ? (
                        <p className='shrink-0 text-[8px] font-black tracking-widest text-primary/70 uppercase'>
                          已选中
                        </p>
                      ) : (
                        <span className='block w-0' aria-hidden='true' />
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-5 shadow-inner'>
              <div className='flex min-h-24 items-center justify-center text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-30'>
                {t('users.table.noResults')}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      <Card
        className={cn(
          'overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-1 shadow-inner',
          isPermissionsMode && 'hidden md:block'
        )}
      >
        <div className='scrollbar-thin overflow-x-auto rounded-[20px] bg-background/50'>
          <Table className='min-w-[1000px]'>
            <TableHeader className='bg-muted/50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='border-none hover:bg-transparent'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'h-10 py-0 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase',
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
                    className='h-24 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-30'
                  >
                    {t('users.table.syncing')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='border-muted/20 transition-colors hover:bg-muted/30'
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
                    className='h-24 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-30'
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
      {showBulkActions && selectionEnabled ? (
        <DataTableBulkActions table={table} />
      ) : null}
    </div>
  )
}

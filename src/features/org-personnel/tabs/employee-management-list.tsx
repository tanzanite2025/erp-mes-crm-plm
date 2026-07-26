'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  type PaginationState,
  type Row,
} from '@tanstack/react-table'
import {
  Clock,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Share,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableFacetedFilter,
  DataTablePagination,
} from '@/components/data-table'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { ForbiddenState } from '@/components/forbidden-state'
import { EmployeeActionDialog } from '../components/employee-action-dialog'
import { EmployeeBulkActions } from '../components/employee-bulk-actions'
import {
  getEmployeeColumns,
  UNASSIGNED_POSITION_FILTER_VALUE,
} from '../components/employee-columns'
import { ImportPersonnelDialog } from '../components/import-personnel-dialog'
import { type Employee, type EmployeeStatus } from '../data/schema'
import { useEmployeesQuery } from '../hooks/use-employees-query'
import { useOrgPersonnelLookups } from '../hooks/use-org-personnel-lookups'
import { EmployeeMaintenanceService } from '../services/employee-maintenance-service'
import {
  downloadPersonnelTemplate,
  exportPersonnelData,
} from '../utils/personnel-import-utils'

const logger = createLogger('EmployeeManagementList')

type RecentResignSnapshot = {
  employees: Array<{
    id: string
    name: string
    staffId?: string
  }>
  operatedAt: string
}

export function EmployeeManagementList() {
  const { locale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Employee | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    id: false,
    positionName: true,
  })
  const [recentResignSnapshot, setRecentResignSnapshot] =
    useState<RecentResignSnapshot | null>(null)
  const [isUndoingRecentResign, setIsUndoingRecentResign] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [itemsToDelete, setItemsToDelete] = useState<Employee[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const employeesQuery = useEmployeesQuery()
  const {
    nameMap,
    error: lookupError,
    isLoading: isLookupsLoading,
  } = useOrgPersonnelLookups()

  const data = useMemo(() => {
    if (employeesQuery.isLoading) return []
    if (!employeesQuery.data) {
      const error = new Error('[CRITICAL] Employee list is missing after load')
      failLoudly(error, 'EmployeeManagementList.data')
      throw error
    }
    return employeesQuery.data
  }, [employeesQuery.data, employeesQuery.isLoading])
  const error = employeesQuery.error ?? lookupError
  const isLoading = employeesQuery.isLoading || isLookupsLoading

  useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalFilter(searchValue)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchValue])

  const refreshEmployees = async () => {
    await employeesQuery.invalidateEmployees()
  }

  const handleBulkStatusChange = async (
    items: Employee[],
    status: Extract<EmployeeStatus, 'active' | 'resigned'>
  ): Promise<number> => {
    const idsToUpdate = items
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id))

    if (idsToUpdate.length === 0) {
      throw new Error(t('orgPersonnel.list.noIdFound'))
    }

    const result = await EmployeeMaintenanceService.updateEmployeesStatus(
      idsToUpdate,
      status
    )
    const updated = result.updated

    if (status === 'resigned') {
      const idsToUpdateSet = new Set(idsToUpdate)
      const recentEmployees = items
        .filter((item) => idsToUpdateSet.has(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          staffId: item.staffId,
        }))

      if (recentEmployees.length > 0) {
        setRecentResignSnapshot({
          employees: recentEmployees,
          operatedAt: result.operatedAt,
        })
      }
    }

    await refreshEmployees()
    setRowSelection({})
    return updated
  }

  const handleUndoRecentResign = async () => {
    if (!recentResignSnapshot) {
      return
    }

    const idsToRestore = recentResignSnapshot.employees.map((item) => item.id)
    if (idsToRestore.length === 0) {
      toast.error(t('orgPersonnel.list.undoErrorEmpty'))
      return
    }

    setIsUndoingRecentResign(true)
    try {
      const result = await EmployeeMaintenanceService.updateEmployeesStatus(
        idsToRestore,
        'active'
      )
      const updated = result.updated
      await refreshEmployees()
      setRowSelection({})

      if (updated === 0) {
        toast.error(t('orgPersonnel.list.undoErrorNone'))
        return
      }

      setRecentResignSnapshot(null)
      if (updated < idsToRestore.length) {
        toast.success(
          t('orgPersonnel.list.undoPartial', {
            updated,
            total: idsToRestore.length,
          })
        )
        return
      }

      toast.success(t('orgPersonnel.list.undoSuccess', { count: updated }))
    } catch (err) {
      logger.error('Undo resign failed', err)
      toast.error(
        err instanceof Error
          ? err.message
          : t('orgPersonnel.list.saveFailed', {
              message: t('orgPersonnel.org.saveFailed'),
            })
      )
    } finally {
      setIsUndoingRecentResign(false)
    }
  }

  const handleBulkDelete = (items: Employee[]) => {
    setItemsToDelete(items)
    setBulkDeleteConfirmOpen(true)
  }

  const onConfirmBulkDelete = async () => {
    if (itemsToDelete.length === 0) return

    try {
      const idsToDelete = itemsToDelete.map((item) => item.id)
      await EmployeeMaintenanceService.deleteEmployees(idsToDelete)
      await refreshEmployees()
      setRowSelection({})
      setBulkDeleteConfirmOpen(false)
      setItemsToDelete([])
      toast.success(
        t('orgPersonnel.importDialog.importSuccess', {
          count: idsToDelete.length,
        })
      )
    } catch (err) {
      logger.error('Bulk delete failed', err)
      toast.error(
        t('orgPersonnel.list.saveFailed', {
          message: err instanceof Error ? err.message : '',
        })
      )
    }
  }

  const handleUpdateEmployee = async (
    finalEmp: Employee,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
    try {
      if (isPatch && delta && finalEmp.id) {
        const savedEmployee = await EmployeeMaintenanceService.patchEmployee(
          finalEmp.id,
          delta,
          finalEmp.version || 1
        )
        toast.success(t('orgPersonnel.list.saveUpdated'))
        await refreshEmployees()
        setCurrentRow(undefined)
        return savedEmployee
      } else {
        const savedEmployee =
          await EmployeeMaintenanceService.saveEmployee(finalEmp)
        toast.success(t('orgPersonnel.list.saveCreated'))
        await refreshEmployees()
        setCurrentRow(undefined)
        return savedEmployee
      }
    } catch (err) {
      logger.error('Update employee failed', err)
      toast.error(
        t('orgPersonnel.list.saveFailed', {
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      )
      throw err
    }
  }

  const handleEditRow = (row: Employee) => {
    setCurrentRow(row)
    setOpen(true)
  }

  const columns = useMemo(() => {
    const baseColumns = getEmployeeColumns(t)
    const actionColumn = {
      id: 'actions',
      header: () => <div className='w-10'></div>,
      cell: ({ row }: { row: Row<Employee> }) => (
        <div className='flex justify-end'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => handleEditRow(row.original)}
            className='size-7 rounded-full transition-colors hover:bg-primary/5 hover:text-primary'
          >
            <Pencil className='size-3.5' />
          </Button>
        </div>
      ),
      meta: { viewable: false },
    }
    return [...baseColumns, actionColumn]
  }, [t])

  const positionFilterOptions = useMemo(() => {
    const options = new Map<string, string>()

    data.forEach((employee) => {
      const rawValue =
        employee.positionName ||
        employee.positionId ||
        UNASSIGNED_POSITION_FILTER_VALUE
      const rawLabel =
        employee.positionName ||
        employee.positionId ||
        t('orgPersonnel.list.unassigned')
      if (!options.has(rawValue)) {
        options.set(rawValue, rawLabel)
      }
    })

    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => {
        if (a.value === UNASSIGNED_POSITION_FILTER_VALUE) return -1
        if (b.value === UNASSIGNED_POSITION_FILTER_VALUE) return 1
        return a.label.localeCompare(b.label)
      })
  }, [data, t])

  const table = useUdsClientTable({
    data,
    columns,
    enableFiltering: true,
    enableFaceting: true,
    state: {
      rowSelection,
      columnVisibility,
      globalFilter,
      pagination,
    },
    meta: { nameMap },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getColumnCanGlobalFilter: (column) => {
      const id = column.id
      return id === 'name' || id === 'staffId'
    },
  })

  const pageCount = table.getPageCount()
  useEffect(() => {
    setPagination((current) => {
      const maxPageIndex = Math.max(pageCount - 1, 0)
      return current.pageIndex > maxPageIndex
        ? { ...current, pageIndex: maxPageIndex }
        : current
    })
  }, [pageCount])

  const recentResignPreviewNames = recentResignSnapshot
    ? recentResignSnapshot.employees
        .slice(0, 6)
        .map((item) => item.name || item.staffId || item.id)
        .join(' / ')
    : ''
  const recentResignExtraCount = recentResignSnapshot
    ? Math.max(recentResignSnapshot.employees.length - 6, 0)
    : 0
  const recentResignTimeLabel = recentResignSnapshot
    ? new Date(recentResignSnapshot.operatedAt).toLocaleString(
        locale === 'zh-CN' ? 'zh-CN' : 'en-US',
        { hour12: false }
      )
    : ''

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='relative z-10 flex flex-col gap-1.5 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4'>
        <div className='flex w-full min-w-0 flex-col gap-1.5 overflow-visible sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center'>
          <div className='relative w-full sm:w-[240px] sm:shrink-0 md:w-[280px]'>
            <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30' />
            <Input
              placeholder={t('orgPersonnel.list.searchPlaceholder')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className='h-12 w-full rounded-2xl border border-dashed border-muted bg-muted/10 pr-10 pl-11 text-sm font-bold shadow-none transition-all placeholder:text-muted-foreground/20 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0'
            />
            {searchValue && (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setSearchValue('')}
                className='absolute top-1/2 right-2 size-7 -translate-y-1/2 rounded-full text-muted-foreground/40 transition-colors hover:bg-transparent hover:text-rose-500'
              >
                <X className='size-3.5' />
              </Button>
            )}
          </div>
          <div className='grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center'>
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title={t('orgPersonnel.list.filterStatus')}
              variant='industrial'
              triggerClassName='!w-full min-w-0 h-10 rounded-xl flex-row gap-1.5 px-2.5 justify-center sm:!w-[105px] sm:px-3'
              options={[
                {
                  label: t('orgPersonnel.excel.statuses.active'),
                  value: 'active',
                  icon: UserCheck,
                },
                {
                  label: t('orgPersonnel.excel.statuses.resigned'),
                  value: 'resigned',
                  icon: UserMinus,
                },
                {
                  label: t('orgPersonnel.excel.statuses.onLeave'),
                  value: 'on-leave',
                  icon: Clock,
                },
              ]}
            />
            <DataTableFacetedFilter
              column={table.getColumn('positionName')}
              title={t('orgPersonnel.list.filterPosition')}
              variant='industrial'
              triggerClassName='!w-full min-w-0 h-10 rounded-xl flex-row gap-1.5 px-2.5 justify-center sm:!w-[105px] sm:px-3'
              options={positionFilterOptions}
            />
            <DataTableViewOptions
              table={table}
              variant='industrial'
              compact
              keepOpenOnItemSelect
              triggerClassName='!w-full min-w-0 sm:!w-[105px]'
              contentClassName='w-[calc(100vw-1rem)] max-w-[22rem] max-h-[46svh] overscroll-contain sm:w-[220px] sm:max-w-none sm:max-h-(--radix-dropdown-menu-content-available-height)'
            />
          </div>
        </div>
        <div className='grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center'>
          <Button
            variant='outline'
            onClick={() => exportPersonnelData(data, nameMap, locale)}
            className='h-10 w-full justify-center rounded-xl border-dashed border-muted px-3 shadow-sm transition-all hover:bg-muted active:scale-95 sm:w-auto'
          >
            <Share className='size-3 text-emerald-600' />
            <span className='text-[10px] leading-none font-black tracking-tighter'>
              {t('orgPersonnel.list.exportData')}
            </span>
          </Button>
          <Button
            variant='outline'
            onClick={() => downloadPersonnelTemplate(locale)}
            className='h-10 w-full justify-center rounded-xl border-dashed border-muted px-3 shadow-sm transition-all hover:bg-muted active:scale-95 sm:w-auto'
          >
            <Download className='size-3 text-blue-600' />
            <span className='text-[10px] leading-none font-black tracking-tighter'>
              {t('orgPersonnel.list.downloadTemplate')}
            </span>
          </Button>
          <Button
            variant='outline'
            onClick={() => setImportOpen(true)}
            className='h-10 w-full justify-center rounded-xl border-dashed border-blue-200 bg-blue-500/5 px-3 shadow-sm transition-all hover:bg-muted active:scale-95 sm:w-auto'
          >
            <FileSpreadsheet className='size-3 text-blue-600' />
            <span className='text-[10px] leading-none font-black tracking-tighter'>
              {t('orgPersonnel.list.batchSync')}
            </span>
          </Button>
          <Button
            onClick={() => {
              setCurrentRow(undefined)
              setOpen(true)
            }}
            className='h-10 w-full justify-center rounded-xl px-3 shadow-xl shadow-blue-500/10 transition-all active:scale-95 sm:w-auto'
          >
            <Plus className='size-3' />
            <span className='text-[10px] leading-none font-black tracking-tighter'>
              {t('orgPersonnel.list.addEmployee')}
            </span>
          </Button>
        </div>
      </div>

      <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-1 shadow-inner'>
        <div className='overflow-hidden rounded-[22px] bg-background/50'>
          <Table>
            <TableHeader className='bg-muted/50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='border-none hover:bg-transparent'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='h-10 py-0 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className='border-muted/20 transition-colors hover:bg-muted/30'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className='py-3 text-xs font-medium'
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
                    colSpan={table.getAllColumns().length}
                    className='h-24 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-30'
                  >
                    {isLoading
                      ? t('common.actions.loading')
                      : t('orgPersonnel.list.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <DataTablePagination table={table} />

      {recentResignSnapshot && (
        <Card className='animate-in rounded-[24px] border-dashed border-amber-300/60 bg-amber-50/20 p-5 shadow-inner duration-500 fade-in slide-in-from-bottom-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='space-y-1.5'>
              <p className='text-[10px] font-black tracking-[0.2em] text-amber-700/80 uppercase italic'>
                {t('orgPersonnel.list.recentResignTitle')}
              </p>
              <p className='text-xs font-black text-slate-700 italic'>
                {t('orgPersonnel.list.recentResignCount', {
                  count: recentResignSnapshot.employees.length,
                  time: recentResignTimeLabel,
                })}
              </p>
              <div className='flex items-center gap-1.5 text-[10px] font-bold tracking-tight text-muted-foreground/60'>
                <span className='tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.list.recentResignPeople', { names: '' })}
                </span>
                <span className='text-slate-600'>
                  {recentResignPreviewNames}
                </span>
                {recentResignExtraCount > 0 && (
                  <span className='rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700'>
                    +{recentResignExtraCount}
                  </span>
                )}
              </div>
              <p className='mt-2 text-[9px] font-black tracking-widest uppercase opacity-40'>
                {t('orgPersonnel.list.recentResignHint')}
              </p>
            </div>
            <Button
              variant='outline'
              onClick={() => {
                void handleUndoRecentResign()
              }}
              disabled={isUndoingRecentResign}
              className='h-11 rounded-full border-amber-200 bg-amber-100/50 text-[10px] font-black tracking-widest text-amber-700 uppercase shadow-sm hover:bg-amber-100'
            >
              {isUndoingRecentResign
                ? t('orgPersonnel.list.undoing')
                : t('orgPersonnel.list.undoResign')}
            </Button>
          </div>
        </Card>
      )}

      <EmployeeBulkActions
        table={table}
        onDelete={handleBulkDelete}
        onStatusChange={handleBulkStatusChange}
        onEdit={(items) => {
          if (items.length > 1) {
            toast.info(t('orgPersonnel.list.bulkActionInProgress'))
          }
          if (items.length > 0) {
            handleEditRow(items[0])
          }
        }}
      />

      <EmployeeActionDialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val)
          if (!val) setCurrentRow(undefined)
        }}
        currentRow={currentRow}
        onSubmit={handleUpdateEmployee}
      />

      <ImportPersonnelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={refreshEmployees}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title={t('orgPersonnel.list.bulk.deleteTitle')}
        desc={t('orgPersonnel.list.bulkDeleteConfirm', {
          count: itemsToDelete.length,
        })}
        handleConfirm={onConfirmBulkDelete}
        destructive
      />
    </div>
  )
}

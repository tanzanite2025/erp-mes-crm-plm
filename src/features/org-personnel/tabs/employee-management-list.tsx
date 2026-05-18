'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    flexRender,
    type PaginationState,
    type Row,
} from '@tanstack/react-table'
import { Clock, Download, FileSpreadsheet, Pencil, Plus, Search, Share, UserCheck, UserMinus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTableFacetedFilter, DataTablePagination } from '@/components/data-table'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { ForbiddenState } from '@/components/forbidden-state'
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
import { useLanguage } from '@/context/language-provider'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { EmployeeActionDialog } from '../components/employee-action-dialog'
import { EmployeeBulkActions } from '../components/employee-bulk-actions'
import { getEmployeeColumns, UNASSIGNED_POSITION_FILTER_VALUE } from '../components/employee-columns'
import { ImportPersonnelDialog } from '../components/import-personnel-dialog'
import { type Employee } from '../data/schema'
import { useEmployeesQuery } from '../hooks/use-employees-query'
import { useOrgPersonnelLookups } from '../hooks/use-org-personnel-lookups'
import { type EmployeeStatus } from '../data/schema'
import { EmployeeMaintenanceService } from '../services/employee-maintenance-service'
import { downloadPersonnelTemplate, exportPersonnelData } from '../utils/personnel-import-utils'

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
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        id: false,
        positionName: true,
    })
    const [recentResignSnapshot, setRecentResignSnapshot] = useState<RecentResignSnapshot | null>(null)
    const [isUndoingRecentResign, setIsUndoingRecentResign] = useState(false)
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
    const [itemsToDelete, setItemsToDelete] = useState<Employee[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [searchValue, setSearchValue] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

    const employeesQuery = useEmployeesQuery()
    const { nameMap, error: lookupError, isLoading: isLookupsLoading } = useOrgPersonnelLookups({
        includeProductionResources: true,
    })

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

        const result = await EmployeeMaintenanceService.updateEmployeesStatus(idsToUpdate, status)
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
            const result = await EmployeeMaintenanceService.updateEmployeesStatus(idsToRestore, 'active')
            const updated = result.updated
            await refreshEmployees()
            setRowSelection({})

            if (updated === 0) {
                toast.error(t('orgPersonnel.list.undoErrorNone'))
                return
            }

            setRecentResignSnapshot(null)
            if (updated < idsToRestore.length) {
                toast.success(t('orgPersonnel.list.undoPartial', { updated, total: idsToRestore.length }))
                return
            }

            toast.success(t('orgPersonnel.list.undoSuccess', { count: updated }))
        } catch (err) {
            logger.error('Undo resign failed', err)
            toast.error(err instanceof Error ? err.message : t('orgPersonnel.list.saveFailed', { message: t('orgPersonnel.org.saveFailed') }))
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
            toast.success(t('orgPersonnel.importDialog.importSuccess', { count: idsToDelete.length }))
        } catch (err) {
            logger.error('Bulk delete failed', err)
            toast.error(t('orgPersonnel.list.saveFailed', { message: err instanceof Error ? err.message : '' }))
        }
    }

    const handleUpdateEmployee = async (finalEmp: Employee, isPatch?: boolean, delta?: DeltaSet) => {
        try {
            if (isPatch && delta && finalEmp.id) {
                const savedEmployee = await EmployeeMaintenanceService.patchEmployee(finalEmp.id, delta, finalEmp.version || 1)
                toast.success(t('orgPersonnel.list.saveUpdated'))
                await refreshEmployees()
                setCurrentRow(undefined)
                return savedEmployee
            } else {
                const savedEmployee = await EmployeeMaintenanceService.saveEmployee(finalEmp)
                toast.success(t('orgPersonnel.list.saveCreated'))
                await refreshEmployees()
                setCurrentRow(undefined)
                return savedEmployee
            }
        } catch (err) {
            logger.error('Update employee failed', err)
            toast.error(t('orgPersonnel.list.saveFailed', {
                message: err instanceof Error ? err.message : 'Unknown error',
            }))
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
                        className='size-7 rounded-full hover:bg-primary/5 hover:text-primary transition-colors'
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
            const rawValue = employee.positionName || employee.positionId || UNASSIGNED_POSITION_FILTER_VALUE
            const rawLabel = employee.positionName || employee.positionId || t('orgPersonnel.list.unassigned')
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
        ? new Date(recentResignSnapshot.operatedAt).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { hour12: false })
        : ''

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-4'>
            <div className='relative z-10 flex items-center justify-between gap-4 px-1 flex-wrap'>
                <div className='flex min-w-0 flex-wrap items-center gap-2 overflow-visible'>
                    <div className='relative w-[240px] md:w-[280px] shrink-0'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30' />
                        <Input
                            placeholder={t('orgPersonnel.list.searchPlaceholder')}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className='h-12 w-full pl-11 pr-10 rounded-2xl border border-dashed border-muted bg-muted/10 font-bold text-sm shadow-none transition-all focus-visible:bg-background focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/20'
                        />
                        {searchValue && (
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => setSearchValue('')}
                                className='absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full hover:bg-transparent text-muted-foreground/40 hover:text-rose-500 transition-colors'
                            >
                                <X className='size-3.5' />
                            </Button>
                        )}
                    </div>
                    <DataTableFacetedFilter
                        column={table.getColumn('status')}
                        title={t('orgPersonnel.list.filterStatus')}
                        subtitle={t('orgPersonnel.list.filterFiltering')}
                        variant='industrial'
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
                        subtitle={t('orgPersonnel.list.filterPositionCode')}
                        variant='industrial'
                        options={positionFilterOptions}
                    />
                    <DataTableViewOptions table={table} variant='industrial' />
                </div>
                <div className='flex items-center gap-2 flex-wrap'>
                    <Button
                        variant='outline'
                        onClick={() => exportPersonnelData(data, nameMap, locale)}
                        className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
                    >
                        <div className='flex items-center gap-1'>
                            <Share className='size-3 text-emerald-600' />
                            <span className='text-[10px] font-black tracking-tighter'>{t('orgPersonnel.list.exportData')}</span>
                        </div>
                        <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest'>{t('orgPersonnel.list.exporting')}</span>
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => downloadPersonnelTemplate(locale)}
                        className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
                    >
                        <div className='flex items-center gap-1'>
                            <Download className='size-3 text-blue-600' />
                            <span className='text-[10px] font-black tracking-tighter'>{t('orgPersonnel.list.downloadTemplate')}</span>
                        </div>
                        <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest'>{t('orgPersonnel.list.templates')}</span>
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => setImportOpen(true)}
                        className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-dashed shadow-sm hover:bg-muted active:scale-95 transition-all bg-blue-500/5 border-blue-200 p-0'
                    >
                        <div className='flex items-center gap-1'>
                            <FileSpreadsheet className='size-3 text-blue-600' />
                            <span className='text-[10px] font-black tracking-tighter'>
                                {t('orgPersonnel.list.batchSync')}
                            </span>
                        </div>
                        <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest leading-none'>
                            {t('orgPersonnel.list.batchSyncHint')}
                        </span>
                    </Button>
                    <Button
                        onClick={() => {
                            setCurrentRow(undefined)
                            setOpen(true)
                        }}
                        className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-blue-500/10 active:scale-95 transition-all p-0'
                    >
                        <div className='flex items-center gap-1'>
                            <Plus className='size-3' />
                            <span className='text-[10px] font-black tracking-tighter'>{t('orgPersonnel.list.addEmployee')}</span>
                        </div>
                        <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest'>{t('orgPersonnel.list.addPers')}</span>
                    </Button>
                </div>
            </div>

            <Card className='rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50 p-1 overflow-hidden'>
                <div className='bg-background/50 rounded-[22px] overflow-hidden'>
                    <Table>
                        <TableHeader className='bg-muted/50'>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className='hover:bg-transparent border-none'>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className='h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 py-0'>
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
                                    <TableRow key={row.id} className='border-muted/20 hover:bg-muted/30 transition-colors'>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='py-3 text-xs font-medium'>
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
                                        className='h-24 text-center text-[10px] font-black uppercase tracking-widest opacity-30 text-muted-foreground'
                                    >
                                        {isLoading ? t('common.actions.loading') : t('orgPersonnel.list.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <DataTablePagination table={table} />

            {recentResignSnapshot && (
                <Card className='rounded-[24px] border-dashed border-amber-300/60 bg-amber-50/20 shadow-inner p-5 animate-in fade-in slide-in-from-bottom-4 duration-500'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                        <div className='space-y-1.5'>
                            <p className='text-[10px] font-black tracking-[0.2em] uppercase text-amber-700/80 italic'>
                                {t('orgPersonnel.list.recentResignTitle')}
                            </p>
                            <p className='text-xs font-black italic text-slate-700'>
                                {t('orgPersonnel.list.recentResignCount', {
                                    count: recentResignSnapshot.employees.length,
                                    time: recentResignTimeLabel,
                                })}
                            </p>
                            <div className='flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 tracking-tight'>
                                <span className='uppercase opacity-50 tracking-widest'>{t('orgPersonnel.list.recentResignPeople', { names: '' })}</span>
                                <span className='text-slate-600'>{recentResignPreviewNames}</span>
                                {recentResignExtraCount > 0 && (
                                    <span className='bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[8px] font-black'>
                                        +{recentResignExtraCount}
                                    </span>
                                )}
                            </div>
                            <p className='text-[9px] font-black uppercase tracking-widest opacity-40 mt-2'>
                                {t('orgPersonnel.list.recentResignHint')}
                            </p>
                        </div>
                        <Button
                            variant='outline'
                            onClick={() => {
                                void handleUndoRecentResign()
                            }}
                            disabled={isUndoingRecentResign}
                            className='h-11 rounded-full border-amber-200 bg-amber-100/50 text-amber-700 hover:bg-amber-100 shadow-sm font-black text-[10px] uppercase tracking-widest'
                        >
                            {isUndoingRecentResign ? t('orgPersonnel.list.undoing') : t('orgPersonnel.list.undoResign')}
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
                desc={t('orgPersonnel.list.bulkDeleteConfirm', { count: itemsToDelete.length })}
                handleConfirm={onConfirmBulkDelete}
                destructive
            />
        </div>
    )
}

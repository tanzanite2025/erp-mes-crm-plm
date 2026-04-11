'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    type Row,
    useReactTable,
} from '@tanstack/react-table'
import { Download, FileSpreadsheet, Plus, Share, Pencil, UserCheck, UserMinus, Clock, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableFacetedFilter } from '@/components/data-table'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'

import { EmployeeActionDialog } from '../components/employee-action-dialog'
import { ImportPersonnelDialog } from '../components/import-personnel-dialog'
import { EmployeeBulkActions } from '../components/employee-bulk-actions'
import { getEmployeeColumns } from '../components/employee-columns'
import { type Employee } from '../data/schema'
import { employees as initialData } from '../data/employees'
import { downloadPersonnelTemplate, exportPersonnelData } from '../utils/personnel-import-utils'
import { type EmployeeStatus } from '../services/employee-service'
import { EmployeeCoreService } from '../services/employee-core-service'
import { EmployeeMaintenanceService } from '../services/employee-maintenance-service'
import { OrgService } from '../services/org-service'
import { productionLinesService } from '@/features/production-shared/services/production-lines-service'
import { productionProcessesService } from '@/features/production-shared/services/production-processes-service'
import { type OrgNode } from '../data/org-schema'
import { type DeltaSet } from '@/lib/delta/types'

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
    const [data, setData] = useState<Employee[]>(initialData)
    const [open, setOpen] = useState(false)
    const [currentRow, setCurrentRow] = useState<Employee | undefined>(undefined)
    const [importOpen, setImportOpen] = useState(false)
    const [rowSelection, setRowSelection] = useState({})
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        id: false,
    })
    const [nameMap, setNameMap] = useState<Record<string, string>>({})
    const [recentResignSnapshot, setRecentResignSnapshot] = useState<RecentResignSnapshot | null>(null)
    const [isUndoingRecentResign, setIsUndoingRecentResign] = useState(false)
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
    const [itemsToDelete, setItemsToDelete] = useState<Employee[]>([])
    const [error, setError] = useState<unknown>(null)
    const [globalFilter, setGlobalFilter] = useState('')
    const [searchValue, setSearchValue] = useState('')

    // 防抖处理：避免频繁触发表格重绘导致的输入卡顿
    useEffect(() => {
        const handler = setTimeout(() => {
            setGlobalFilter(searchValue)
        }, 300)
        return () => clearTimeout(handler)
    }, [searchValue])

    const loadLookups = useCallback(async () => {
        try {
            const [orgData, lineData, prcData] = await Promise.all([
                OrgService.getOrgTree(),
                productionLinesService.getLines(),
                productionProcessesService.getSteps(),
            ])

            const newMap: Record<string, string> = {}

            const flattenOrg = (nodes: OrgNode[]) => {
                nodes.forEach((node) => {
                    newMap[node.id || ''] = node.name
                    if (node.children) flattenOrg(node.children)
                })
            }
            flattenOrg(orgData)

            lineData.forEach((line) => {
                newMap[line.id] = line.name
                line.segments.forEach((seg) => {
                    seg.jobCategories.forEach((category) => {
                        category.stations.forEach((station) => {
                            station.processes.forEach((process) => {
                                newMap[process.id] = process.name
                            })
                        })
                    })
                })
            })

            prcData.forEach((process) => {
                newMap[process.id] = process.name
            })

            setNameMap(newMap)
        } catch (err) {
            logger.error('Load lookups failed', err)
        }
    }, [])

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

        const updated = await EmployeeMaintenanceService.updateEmployeesStatus(idsToUpdate, status)

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
                    operatedAt: new Date().toISOString(),
                })
            }
        }

        await loadData()
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
            const updated = await EmployeeMaintenanceService.updateEmployeesStatus(idsToRestore, 'active')
            await loadData()
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

    const loadData = useCallback(async () => {
        try {
            setError(null)
            await loadLookups()
            const stored = await EmployeeCoreService.getEmployees()
            if (stored) setData(stored)
        } catch (err) {
            setError(err)
            logger.error('Load failed', err)
        }
    }, [loadLookups])

    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadData()
        }, 0)

        void loadData()

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [loadData])

    const handleBulkDelete = (items: Employee[]) => {
        setItemsToDelete(items)
        setBulkDeleteConfirmOpen(true)
    }

    const onConfirmBulkDelete = async () => {
        if (itemsToDelete.length === 0) return
        try {
            const idsToDelete = itemsToDelete.map((item) => item.id)
            await EmployeeMaintenanceService.deleteEmployees(idsToDelete)
            await loadData()
            setRowSelection({})
            setBulkDeleteConfirmOpen(false)
            setItemsToDelete([])
            toast.success(t('orgPersonnel.importDialog.importSuccess', { count: idsToDelete.length }))
        } catch (err) {
            logger.error('Bulk delete failed', err)
            toast.error(t('orgPersonnel.list.saveFailed', { message: err instanceof Error ? err.message : '' }))
        }
    }

    // SDRTS: 适配增量 Patch 提交
    const handleUpdateEmployee = async (finalEmp: Employee, isPatch?: boolean, delta?: DeltaSet) => {
        try {
            if (isPatch && delta && finalEmp.id) {
                // 执行增量更新
                await EmployeeMaintenanceService.patchEmployee(finalEmp.id, delta, finalEmp.version || 1)
                toast.success(t('orgPersonnel.list.saveUpdated'))
            } else {
                // 执行全量保存 (创建新员工)
                await EmployeeMaintenanceService.saveEmployee(finalEmp)
                toast.success(t('orgPersonnel.list.saveCreated'))
            }
            await loadData()
            setCurrentRow(undefined)
        } catch (err) {
            logger.error('Update employee failed', err)
            toast.error(t('orgPersonnel.list.saveFailed', {
                message: err instanceof Error ? err.message : 'Unknown error'
            }))
        }
    }

    const handleEditRow = (row: Employee) => {
        setCurrentRow(row)
        setOpen(true)
    }

    // 动态注入操作列，实现增量介入入口
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

    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection,
            columnVisibility,
            globalFilter,
        },
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onRowSelectionChange: setRowSelection,
        // 性能关键优化：仅允许对“姓名”和“工号”进行全局搜索过滤
        getColumnCanGlobalFilter: (column) => {
            const id = column.id
            return id === 'name' || id === 'staffId'
        },
    })

    const recentResignPreviewNames = recentResignSnapshot
        ? recentResignSnapshot.employees
            .slice(0, 6)
            .map((item) => item.name || item.staffId || item.id)
            .join('、')
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
            <div className='flex items-center justify-between px-1 gap-4 flex-wrap'>
                <div className='flex items-center gap-3 overflow-hidden'>
                    <div className='relative w-[240px] md:w-[280px] shrink-0'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30' />
                        <Input
                            placeholder={t('orgPersonnel.list.searchPlaceholder')}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className='h-12 w-full pl-11 pr-10 rounded-[18px] border border-dashed border-muted bg-muted/10 font-bold text-sm shadow-none transition-all focus-visible:bg-background focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/20'
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
                    <DataTableViewOptions table={table} variant='industrial' />
                </div>
                <div className='flex items-center gap-2 flex-wrap'>
                    <Button
                        variant='outline'
                        onClick={() => exportPersonnelData(data, nameMap, locale)}
                        className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
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
                        className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
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
                        className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 border-dashed shadow-sm hover:bg-muted active:scale-95 transition-all bg-blue-500/5 border-blue-200 p-0'
                    >
                        <div className='flex items-center gap-1'>
                            <FileSpreadsheet className='size-3 text-blue-600' />
                            <span className='text-[10px] font-black tracking-tighter'>
                                {locale === 'zh-CN' ? '批量同步' : 'Batch sync'}
                            </span>
                        </div>
                        <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest leading-none'>
                            {locale === 'zh-CN' ? '新增 / 更新' : 'add / update'}
                        </span>
                    </Button>
                    <Button
                        onClick={() => {
                            setCurrentRow(undefined)
                            setOpen(true)
                        }}
                        className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-blue-500/10 active:scale-95 transition-all p-0'
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
                                        {t('orgPersonnel.list.empty')}
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
                                    time: recentResignTimeLabel
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
                        toast.info(locale === 'zh-CN' ? '正在批量处理中...' : 'Bulk action in progress...')
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
                onSuccess={loadData}
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

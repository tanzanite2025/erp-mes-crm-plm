'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { EmployeeBulkResignDialog } from './employee-bulk-resign-dialog'
import { EmployeeMultiDeleteDialog } from './employee-multi-delete-dialog'

type EmployeeBulkActionsProps<TData> = {
    table: Table<TData>
    onDelete?: (items: TData[]) => void
    onStatusChange?: (items: TData[], status: 'active' | 'resigned') => Promise<number>
}

export function EmployeeBulkActions<TData>({
    table,
    onDelete,
    onStatusChange,
}: EmployeeBulkActionsProps<TData>) {
    const { t } = useLanguage()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showResignConfirm, setShowResignConfirm] = useState(false)

    const handleBulkResign = async (items: TData[]) => {
        if (!onStatusChange) {
            throw new Error(t('orgPersonnel.list.bulk.notEnabled' as any))
        }

        return await onStatusChange(items, 'resigned')
    }

    return (
        <>
            <BulkActionsToolbar table={table} entityName={t('orgPersonnel.list.bulk.entity' as any)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant='outline'
                            size='icon'
                            onClick={() => {
                                if (!onStatusChange) {
                                    toast.error(t('orgPersonnel.list.bulk.notEnabled' as any))
                                    return
                                }
                                setShowResignConfirm(true)
                            }}
                            className='size-8'
                            title={t('orgPersonnel.list.bulk.resignTitle' as any)}
                        >
                            <UserX className='size-3.5 text-slate-500' />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('orgPersonnel.list.bulk.resignTitle' as any)}</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant='destructive'
                            size='icon'
                            onClick={() => setShowDeleteConfirm(true)}
                            className='size-8'
                            title={t('orgPersonnel.list.bulk.deleteTitle' as any)}
                        >
                            <Trash2 />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('orgPersonnel.list.bulk.deleteTitle' as any)}</p>
                    </TooltipContent>
                </Tooltip>
            </BulkActionsToolbar>

            <EmployeeMultiDeleteDialog
                table={table}
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onDelete={onDelete}
            />

            <EmployeeBulkResignDialog
                table={table}
                open={showResignConfirm}
                onOpenChange={setShowResignConfirm}
                onResign={handleBulkResign}
            />
        </>
    )
}

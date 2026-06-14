'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
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
  onStatusChange?: (
    items: TData[],
    status: 'active' | 'resigned'
  ) => Promise<number>
  onEdit?: (items: TData[]) => void
}

export function EmployeeBulkActions<TData>({
  table,
  onDelete,
  onStatusChange,
  onEdit,
}: EmployeeBulkActionsProps<TData>) {
  const { t } = useLanguage()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)

  const handleBulkResign = async (items: TData[]) => {
    if (!onStatusChange) {
      throw new Error(t('orgPersonnel.list.bulk.notEnabled'))
    }

    return await onStatusChange(items, 'resigned')
  }

  return (
    <>
      <BulkActionsToolbar
        table={table}
        entityName={t('orgPersonnel.list.bulk.entity')}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => {
                const selected = table.getFilteredSelectedRowModel().rows
                if (selected.length > 0 && onEdit) {
                  onEdit(selected.map((r) => r.original))
                }
              }}
              className='size-8'
              title={t('orgPersonnel.list.bulk.editTitle')}
            >
              <Pencil className='size-3.5 text-slate-500' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('orgPersonnel.list.bulk.editTitle')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => {
                if (!onStatusChange) {
                  toast.error(t('orgPersonnel.list.bulk.notEnabled'))
                  return
                }
                setShowResignConfirm(true)
              }}
              className='size-8'
              title={t('orgPersonnel.list.bulk.resignTitle')}
            >
              <UserX className='size-3.5 text-slate-500' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('orgPersonnel.list.bulk.resignTitle')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              title={t('orgPersonnel.list.bulk.deleteTitle')}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('orgPersonnel.list.bulk.deleteTitle')}</p>
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

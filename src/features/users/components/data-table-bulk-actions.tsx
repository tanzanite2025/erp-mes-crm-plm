import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'
import { useLanguage } from '@/context/language-provider'
import { isSuperAdmin } from '../utils/user-utils'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useLanguage()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows
  
  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const allSelected = selectedRows.map((row) => row.original as User)
    const actionableUsers = allSelected.filter(user => !isSuperAdmin(user))
    const skippedCount = allSelected.length - actionableUsers.length

    if (actionableUsers.length === 0) {
      toast.error(t('users.toast.noActionableUsers'))
      table.resetRowSelection()
      return
    }

    if (skippedCount > 0) {
      toast.warning(t('users.toast.skippedProtected', { count: skippedCount }))
    }

    toast.promise(sleep(2000), {
      loading: status === 'active' ? t('users.toast.activateSyncing') : t('users.toast.deactivateSyncing'),
      success: () => {
        table.resetRowSelection()
        return status === 'active' ? t('users.toast.activateSuccess', { count: actionableUsers.length }) : t('users.toast.deactivateSuccess', { count: actionableUsers.length })
      },
      error: t('users.toast.switchAdminFailed'),
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const allSelected = selectedRows.map((row) => row.original as User)
    const actionableUsers = allSelected.filter(user => !isSuperAdmin(user))
    const skippedCount = allSelected.length - actionableUsers.length

    if (actionableUsers.length === 0) {
      toast.error(t('users.toast.noActionableUsers'))
      table.resetRowSelection()
      return
    }

    if (skippedCount > 0) {
      toast.warning(t('users.toast.skippedProtected', { count: skippedCount }))
    }

    toast.promise(sleep(2000), {
      loading: t('users.toast.inviteSyncing'),
      success: () => {
        table.resetRowSelection()
        return t('users.toast.inviteSuccess', { count: actionableUsers.length })
      },
      error: t('users.toast.switchAdminFailed'),
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName={t('users.layout.listTitle')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label={t('users.actions.invite')}
              title={t('users.actions.invite')}
            >
              <Mail />
              <span className='sr-only'>{t('users.actions.invite')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.actions.invite')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label={t('users.actions.activate')}
              title={t('users.actions.activate')}
            >
              <UserCheck />
              <span className='sr-only'>{t('users.actions.activate')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.actions.activate')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label={t('users.actions.deactivate')}
              title={t('users.actions.deactivate')}
            >
              <UserX />
              <span className='sr-only'>{t('users.actions.deactivate')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.actions.deactivate')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label={t('common.actions.delete')}
              title={t('common.actions.delete')}
            >
              <Trash2 />
              <span className='sr-only'>{t('common.actions.delete')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('common.actions.delete')}</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}

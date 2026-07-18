import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { PermissionBoundary } from '@/components/permission-boundary'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useLanguage()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <PermissionBoundary permission='user_delete'>
      <BulkActionsToolbar
        table={table}
        entityName={t('users.layout.listTitle')}
      >
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
    </PermissionBoundary>
  )
}

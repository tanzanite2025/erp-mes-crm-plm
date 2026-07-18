import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Trash2, UserPen, Lock, ShieldPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PermissionBoundary } from '@/components/permission-boundary'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type User } from '../data/schema'
import { isProtectedSystemAccount } from '../utils/user-utils'
import { useUsers } from './users-provider'

type DataTableRowActionsProps = {
  row: Row<User>
  mode?: 'management' | 'permissions'
}

export function DataTableRowActions({
  row,
  mode = 'management',
}: DataTableRowActionsProps) {
  const { t } = useLanguage()
  const { setOpen, setCurrentRow } = useUsers()
  const isProtected = isProtectedSystemAccount(row.original)
  const isPermissionsMode = mode === 'permissions'
  const currentUserID = useAuthStore((state) => state.user?.id || '')
  const { allowsPermission } = usePermissionActions()
  const canManagePermissions = allowsPermission('perm_manage')
  const canEdit =
    allowsPermission('user_edit') &&
    (canManagePermissions || row.original.id === currentUserID)
  const canDelete =
    allowsPermission('user_delete') && row.original.id !== currentUserID

  if (isPermissionsMode) {
    return (
      <PermissionBoundary permission='perm_manage'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={isProtected}
          onClick={() => {
            if (isProtected) return
            setCurrentRow(row.original)
            setOpen('permissions')
          }}
          className='h-9 rounded-full text-[10px] font-black tracking-widest uppercase'
        >
          {t('users.actions.managePermissions')}
        </Button>
      </PermissionBoundary>
    )
  }

  if (!canManagePermissions && !canEdit && !canDelete) {
    return null
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <DropdownMenuShortcut>
              <DotsHorizontalIcon className='h-4 w-4' />
              <span className='sr-only'>{t('common.actions.preview')}</span>
            </DropdownMenuShortcut>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[160px]'>
          <PermissionBoundary permission='perm_manage'>
            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('permissions')
              }}
              title={
                isProtected ? t('users.table.protectedTooltip') : undefined
              }
            >
              {t('users.actions.managePermissions')}
              <DropdownMenuShortcut>
                {isProtected ? (
                  <Lock size={14} className='text-amber-500' />
                ) : (
                  <ShieldPlus size={16} />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </PermissionBoundary>

          {canEdit ? (
            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('edit')
              }}
              title={
                isProtected ? t('users.table.protectedTooltip') : undefined
              }
            >
              {t('common.actions.edit')}
              <DropdownMenuShortcut>
                {isProtected ? (
                  <Lock size={14} className='text-amber-500' />
                ) : (
                  <UserPen size={16} />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ) : null}

          {canDelete ? (
            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('delete')
              }}
              className={isProtected ? 'opacity-50' : 'text-red-500!'}
              title={
                isProtected ? t('users.table.protectedTooltip') : undefined
              }
            >
              {t('common.actions.delete')}
              <DropdownMenuShortcut>
                {isProtected ? (
                  <Lock size={14} className='text-amber-500' />
                ) : (
                  <Trash2 size={16} />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

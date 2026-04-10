import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Trash2, UserPen, Lock, ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { isSuperAdmin } from '../utils/user-utils'

type DataTableRowActionsProps = {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { t } = useLanguage()
  const { setOpen, setCurrentRow } = useUsers()
  const isProtected = isSuperAdmin(row.original)

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
          <NonBlockingPermissionBoundary permission='user_edit'>
            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('roles')
              }}
              title={isProtected ? t('users.table.protectedTooltip') : undefined}
            >
              {t('users.actions.manageRoles')}
              <DropdownMenuShortcut>
                {isProtected ? <Lock size={14} className='text-amber-500' /> : <ShieldPlus size={16} />}
              </DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('edit')
              }}
              title={isProtected ? t('users.table.protectedTooltip') : undefined}
            >
              {t('common.actions.edit')}
              <DropdownMenuShortcut>
                {isProtected ? <Lock size={14} className='text-amber-500' /> : <UserPen size={16} />}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </NonBlockingPermissionBoundary>
          
          <NonBlockingPermissionBoundary permission='user_delete'>
            <DropdownMenuItem
              disabled={isProtected}
              onClick={() => {
                if (isProtected) return
                setCurrentRow(row.original)
                setOpen('delete')
              }}
              className={isProtected ? 'opacity-50' : 'text-red-500!'}
              title={isProtected ? t('users.table.protectedTooltip') : undefined}
            >
              {t('common.actions.delete')}
              <DropdownMenuShortcut>
                {isProtected ? <Lock size={14} className='text-amber-500' /> : <Trash2 size={16} />}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </NonBlockingPermissionBoundary>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

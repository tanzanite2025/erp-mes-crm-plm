import { type ColumnDef } from '@tanstack/react-table'
import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { callTypes } from '../data/data'
import { type User, type UserStatus } from '../data/schema'
import { isProtectedSystemAccount } from '../utils/user-utils'
import { DataTableRowActions } from './data-table-row-actions'

export type UsersTableMode = 'management' | 'permissions'

const userStatusTranslationKeys: Record<
  UserStatus,
  'users.status.active' | 'users.status.inactive' | 'users.status.suspended'
> = {
  active: 'users.status.active',
  inactive: 'users.status.inactive',
  suspended: 'users.status.suspended',
}

type TranslateFn = (
  key:
    | 'users.dialogs.buttons.confirm'
    | 'users.actions.managePermissions'
    | 'users.columns.username'
    | 'users.columns.name'
    | 'users.columns.role'
    | 'users.columns.phone'
    | 'users.columns.status'
    | 'users.status.active'
    | 'users.status.inactive'
    | 'users.status.suspended',
  params?: Record<string, string | number>
) => string

export function getUsersColumns(
  t: TranslateFn,
  mode: UsersTableMode = 'management',
  showSelection = true
): ColumnDef<User>[] {
  const isPermissionsMode = mode === 'permissions'

  return [
    ...(showSelection
      ? [
          {
            id: 'select',
            header: ({ table }) =>
              isPermissionsMode ? null : (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label={t('users.dialogs.buttons.confirm')}
                  className='translate-y-[2px]'
                />
              ),
            meta: {
              className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
            },
            cell: ({ row, table }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                  if (isPermissionsMode) {
                    table.setRowSelection(value ? { [row.id]: true } : {})
                    return
                  }

                  row.toggleSelected(!!value)
                }}
                aria-label={
                  isPermissionsMode
                    ? t('users.actions.managePermissions')
                    : t('users.dialogs.buttons.confirm')
                }
                className='translate-y-[2px]'
              />
            ),
            enableSorting: false,
            enableHiding: false,
          } satisfies ColumnDef<User>,
        ]
      : []),
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('users.columns.username')}
        />
      ),
      cell: ({ row }) => {
        const protected_ = isProtectedSystemAccount(row.original)
        return (
          <div className='flex items-center gap-2 ps-3'>
            <LongText
              className={cn(
                'max-w-36',
                protected_ && 'font-black text-amber-600 italic'
              )}
            >
              {row.getValue('username')}
            </LongText>
            {protected_ && (
              <ShieldAlert
                size={12}
                className='shrink-0 animate-pulse text-amber-500'
              />
            )}
          </div>
        )
      },
      meta: {
        className: cn(
          'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
          'ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none'
        ),
      },
      enableHiding: false,
    },
    {
      id: 'fullName',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('users.columns.name')}
        />
      ),
      cell: ({ row }) => {
        const { firstName, lastName } = row.original
        const fullName = `${firstName} ${lastName}`
        return <LongText className='max-w-36'>{fullName}</LongText>
      },
      meta: { className: 'w-36' },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('users.columns.role')}
        />
      ),
      cell: ({ row }) => {
        const role = String(row.getValue('role') || '').trim()
        return (
          <Badge
            variant='outline'
            className='rounded-full border-dashed font-mono text-[8px] uppercase'
          >
            {role || 'UNASSIGNED'}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'phoneNumber',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('users.columns.phone')}
        />
      ),
      cell: ({ row }) => <div>{row.getValue('phoneNumber')}</div>,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('users.columns.status')}
        />
      ),
      cell: ({ row }) => {
        const { status } = row.original
        const badgeColor = callTypes.get(status)
        const label = t(userStatusTranslationKeys[status])

        return (
          <div className='flex space-x-2'>
            <Badge
              variant='outline'
              className={cn(
                'h-7 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest uppercase',
                badgeColor
              )}
            >
              {label}
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableHiding: false,
      enableSorting: false,
    },
    ...(!isPermissionsMode
      ? [
          {
            id: 'actions',
            cell: ({ row }) => <DataTableRowActions row={row} mode={mode} />,
          } satisfies ColumnDef<User>,
        ]
      : []),
  ]
}

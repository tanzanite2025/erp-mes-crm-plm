import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { cn } from '@/lib/utils'
import { DataTableRowActions } from './data-table-row-actions'
import { callTypes, roles } from '../data/data'
import { type User, type UserStatus } from '../data/schema'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { resolveRoleLabel } from '../utils/role-resolver'

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
    | 'users.columns.username'
    | 'users.columns.name'
    | 'users.columns.phone'
    | 'users.columns.status'
    | 'users.status.active'
    | 'users.status.inactive'
    | 'users.status.suspended',
  params?: Record<string, string | number>
) => string

type RoleColumnLabels = {
  title: string
  driftTooltip: string
  invalid: string
}

export function getUsersColumns(
  t: TranslateFn,
  dynamicRoles: Role[],
  roleColumnLabels: RoleColumnLabels,
  orgNodes: OrgNode[] = [],
): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('users.dialogs.buttons.confirm')}
          className='translate-y-[2px]'
        />
      ),
      meta: {
        className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('users.dialogs.buttons.confirm')}
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.username')} />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-36 ps-3'>{row.getValue('username')}</LongText>
      ),
      meta: {
        className: cn(
          'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
          'ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none',
        ),
      },
      enableHiding: false,
    },
    {
      id: 'fullName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.name')} />
      ),
      cell: ({ row }) => {
        const { firstName, lastName } = row.original
        const fullName = `${firstName} ${lastName}`
        return <LongText className='max-w-36'>{fullName}</LongText>
      },
      meta: { className: 'w-36' },
    },
    {
      accessorKey: 'phoneNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.phone')} />
      ),
      cell: ({ row }) => <div>{row.getValue('phoneNumber')}</div>,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.status')} />
      ),
      cell: ({ row }) => {
        const { status } = row.original
        const badgeColor = callTypes.get(status)
        const label = t(userStatusTranslationKeys[status])

        return (
          <div className='flex space-x-2'>
            <Badge variant='outline' className={cn('capitalize', badgeColor)}>
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
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={roleColumnLabels.title} />
      ),
      cell: ({ row }) => {
        const { role, resolvedRole, roleInfo } = row.original
        const displayRoleId = resolvedRole || role
        const label = resolveRoleLabel(displayRoleId, dynamicRoles, orgNodes)
        const userType = roles.find(({ value }) => value === displayRoleId)

        return (
          <div
            className='flex items-center gap-x-2'
            title={
              roleInfo?.isStale
                ? roleColumnLabels.driftTooltip
                    .replace('{{original}}', role)
                    .replace('{{resolved}}', resolvedRole ?? '')
                : ''
            }
          >
            {userType?.icon && <userType.icon size={16} className='text-muted-foreground' />}
            <span
              className={cn(
                'text-sm capitalize',
                roleInfo?.isInvalid
                  ? 'text-destructive font-bold'
                  : roleInfo?.isStale
                    ? 'text-amber-600'
                    : '',
              )}
            >
              {label}
            </span>
            {roleInfo?.isInvalid && (
              <div className='flex items-center gap-1 rounded border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive animate-pulse'>
                <span className='font-bold underline'>{roleColumnLabels.invalid}</span>
              </div>
            )}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}

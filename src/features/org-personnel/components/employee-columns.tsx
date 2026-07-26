import { type ColumnDef } from '@tanstack/react-table'
import { type TranslationKey } from '@/locales'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { formatPersonnelDate } from '../config/personnel-archive-columns'
import { type Employee } from '../data/schema'

function renderDateCell(value: string | undefined) {
  const formatted = formatPersonnelDate(value)
  if (!formatted) return <div className='opacity-30'>-</div>
  return (
    <div className='font-mono text-[11px] font-medium tracking-tight uppercase'>
      {formatted}
    </div>
  )
}

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const UNASSIGNED_POSITION_FILTER_VALUE = '__UNASSIGNED_POSITION__'

export const getEmployeeColumns = (t: TranslateFn): ColumnDef<Employee>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { viewable: false },
  },
  {
    id: 'serialNo',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.serialNo')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-[11px] opacity-40'>{row.index + 1}</div>
    ),
    enableSorting: false,
    meta: { viewLabel: t('orgPersonnel.excel.columns.serialNo') },
  },
  {
    accessorKey: 'staffId',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.staffId')}
      />
    ),
    cell: ({ row }) => {
      const staffId = row.getValue('staffId') as string
      return (
        <div className='font-mono text-xs font-black tracking-widest text-primary italic'>
          {staffId || '-'}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
    meta: { viewLabel: t('orgPersonnel.excel.columns.staffId') },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.name')}
      />
    ),
    cell: ({ row }) => (
      <span className='max-w-[150px] truncate font-black tracking-tighter italic'>
        {row.getValue('name')}
      </span>
    ),
    enableHiding: false,
    meta: { viewLabel: t('orgPersonnel.excel.columns.name') },
  },
  {
    id: 'positionName',
    accessorFn: (row) =>
      row.positionName || row.positionId || UNASSIGNED_POSITION_FILTER_VALUE,
    enableSorting: true,
    sortingFn: 'alphanumeric',
    filterFn: (row, id, filterValue) => {
      const filters = Array.isArray(filterValue) ? filterValue : []
      if (filters.length === 0) return true
      return filters.includes(row.getValue(id))
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.position')}
      />
    ),
    cell: ({ row }) => {
      const employee = row.original
      const positionLabel = employee.positionName || employee.positionId || ''

      if (!positionLabel) {
        return (
          <Badge
            variant='outline'
            className='h-5 rounded-full border-none bg-amber-500/10 px-2 text-[8px] font-black tracking-widest text-amber-600'
          >
            {t('orgPersonnel.list.unassigned')}
          </Badge>
        )
      }

      return (
        <div
          className='max-w-[140px] truncate font-bold text-slate-700'
          title={positionLabel}
        >
          {positionLabel}
        </div>
      )
    },
    meta: { viewLabel: t('orgPersonnel.excel.columns.position') },
  },
  {
    accessorKey: 'orgUnitId',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.orgUnitId')}
      />
    ),
    cell: ({ row, table }) => {
      const employee = row.original
      const orgUnitId = row.getValue('orgUnitId') as string
      const meta = table.options.meta as
        | { nameMap?: Record<string, string> }
        | undefined
      const name =
        employee.orgUnitName ||
        meta?.nameMap?.[orgUnitId] ||
        (orgUnitId?.length > 8 ? `${orgUnitId.substring(0, 8)}...` : orgUnitId)
      return (
        <div className='max-w-[120px] truncate font-bold text-slate-600'>
          {name || '-'}
        </div>
      )
    },
    meta: { viewLabel: t('orgPersonnel.excel.columns.orgUnitId') },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.phone')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs font-medium'>
        {row.getValue('phone') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.phone') },
  },
  {
    accessorKey: 'emergencyPhone',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.emergencyPhone')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs font-medium'>
        {row.getValue('emergencyPhone') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.emergencyPhone') },
  },
  {
    accessorKey: 'gender',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.gender')}
      />
    ),
    cell: ({ row }) => {
      const gender = row.getValue('gender') as string
      if (!gender) return <div className='opacity-30'>-</div>
      const normalizedGender = gender.trim().toLowerCase()
      const isFemale = gender === '女' || normalizedGender === 'female'
      return (
        <Badge
          variant='outline'
          className='h-5 rounded-full border-muted/50 px-2 text-[9px] font-bold'
        >
          {isFemale
            ? t('orgPersonnel.excel.gender.female')
            : t('orgPersonnel.excel.gender.male')}
        </Badge>
      )
    },
    meta: { viewLabel: t('orgPersonnel.excel.columns.gender') },
  },
  {
    accessorKey: 'joinedDate',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.joinedDate')}
      />
    ),
    cell: ({ row }) =>
      renderDateCell(row.getValue('joinedDate') as string | undefined),
    meta: { viewLabel: t('orgPersonnel.excel.columns.joinedDate') },
  },
  {
    id: 'workYears',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.workYears')}
      />
    ),
    cell: ({ row }) => {
      const workYears = row.original.workYears
      return <div className='font-mono text-[10px]'>{workYears || '-'}</div>
    },
    enableSorting: false,
    meta: { viewLabel: t('orgPersonnel.excel.columns.workYears') },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.status')}
      />
    ),
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => {
      const status = row.getValue('status') as string

      let label = t('orgPersonnel.excel.statuses.active')
      let style = 'bg-emerald-500/10 text-emerald-600'

      if (status === 'resigned') {
        label = t('orgPersonnel.excel.statuses.resigned')
        style = 'bg-rose-500/10 text-rose-600'
      } else if (status === 'on-leave') {
        label = t('orgPersonnel.excel.statuses.onLeave')
        style = 'bg-amber-500/10 text-amber-600'
      }

      return (
        <Badge
          variant='outline'
          className={`h-5 rounded-full border-none px-2 text-[8px] font-black tracking-widest ${style}`}
        >
          {label}
        </Badge>
      )
    },
    meta: { viewLabel: t('orgPersonnel.excel.columns.status') },
  },
  {
    accessorKey: 'age',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.age')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs font-medium'>
        {row.getValue('age') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.age') },
  },
  {
    accessorKey: 'idCard',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.idCard')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-[11px] font-medium text-muted-foreground'>
        {row.original.maskedIdCard || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.idCard') },
  },
  {
    accessorKey: 'birthday',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.birthday')}
      />
    ),
    cell: ({ row }) =>
      renderDateCell(row.getValue('birthday') as string | undefined),
    meta: { viewLabel: t('orgPersonnel.excel.columns.birthday') },
  },
  {
    accessorKey: 'address',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.address')}
      />
    ),
    cell: ({ row }) => (
      <div className='max-w-[200px] truncate text-[11px] font-medium tracking-tight text-muted-foreground'>
        {row.getValue('address') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.address') },
  },
  {
    accessorKey: 'bankCard',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.bankCard')}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-[11px] font-medium text-muted-foreground'>
        {row.original.maskedBankCard || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.bankCard') },
  },
  {
    accessorKey: 'bankName',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.bankName')}
      />
    ),
    cell: ({ row }) => (
      <div className='max-w-[150px] truncate'>
        {row.getValue('bankName') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.bankName') },
  },
  {
    accessorKey: 'education',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.excel.columns.education')}
      />
    ),
    cell: ({ row }) => (
      <div className='text-xs font-bold'>
        {row.getValue('education') || '-'}
      </div>
    ),
    meta: { viewLabel: t('orgPersonnel.excel.columns.education') },
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('orgPersonnel.org.systemId')}
      />
    ),
    cell: ({ row }) => {
      const id = row.getValue('id') as string
      return (
        <div
          className='w-[80px] truncate overflow-hidden font-mono text-[10.5px] leading-none text-muted-foreground/30'
          title={id}
        >
          {id}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
    meta: { viewable: false },
  },
]

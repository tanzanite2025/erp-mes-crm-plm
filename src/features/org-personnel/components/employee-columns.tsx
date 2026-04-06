import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Employee } from '../data/schema'
import {
    calculatePersonnelWorkYears,
    formatPersonnelDate,
} from '../config/personnel-archive-columns'

function renderDateCell(value: string | undefined) {
    const formatted = formatPersonnelDate(value)
    if (!formatted) return <div className='opacity-30'>-</div>
    return <div className='font-mono text-[9px] uppercase'>{formatted}</div>
}

export const getEmployeeColumns = (t: any): ColumnDef<Employee>[] => [
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
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.serialNo')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px]'>{row.index + 1}</div>,
        enableSorting: false,
        meta: { viewLabel: t('orgPersonnel.excel.columns.serialNo') },
    },
    {
        accessorKey: 'staffId',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.staffId' as any)} />
        ),
        cell: ({ row }) => {
            const staffId = row.getValue('staffId') as string
            return <div className='font-mono text-[11px] font-black italic text-primary tracking-widest'>{staffId || '-'}</div>
        },
        enableSorting: true,
        enableHiding: false,
        meta: { viewLabel: t('orgPersonnel.excel.columns.staffId') },
    },
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.name')} />
        ),
        cell: ({ row }) => (
            <span className='max-w-[150px] truncate font-black italic tracking-tighter'>
                {row.getValue('name')}
            </span>
        ),
        enableHiding: false,
        meta: { viewLabel: t('orgPersonnel.excel.columns.name') },
    },
    {
        accessorKey: 'deptId',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.deptId')} />
        ),
        cell: ({ row, table }) => {
            const employee = row.original
            const deptId = row.getValue('deptId') as string
            const meta = table.options.meta as { nameMap?: Record<string, string> } | undefined
            const name = employee.deptName || meta?.nameMap?.[deptId] || (deptId?.length > 8 ? `${deptId.substring(0, 8)}...` : deptId)
            return <div className='truncate max-w-[120px] font-bold text-slate-600'>{name || '-'}</div>
        },
        meta: { viewLabel: t('orgPersonnel.excel.columns.deptId') },
    },
    {
        accessorKey: 'phone',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.phone')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px]'>{row.getValue('phone') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.phone') },
    },
    {
        accessorKey: 'emergencyPhone',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.emergencyPhone')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px]'>{row.getValue('emergencyPhone') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.emergencyPhone') },
    },
    {
        accessorKey: 'gender',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.gender')} />
        ),
        cell: ({ row }) => {
            const gender = row.getValue('gender') as string
            if (!gender) return <div className='opacity-30'>-</div>
            return (
                <Badge variant='outline' className='font-bold h-5 text-[9px] px-2 rounded-full border-muted/50'>
                    {gender === '男' ? t('orgPersonnel.excel.gender.male') : t('orgPersonnel.excel.gender.female')}
                </Badge>
            )
        },
        meta: { viewLabel: t('orgPersonnel.excel.columns.gender') },
    },
    {
        accessorKey: 'joinedDate',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.joinedDate')} />
        ),
        cell: ({ row }) => renderDateCell(row.getValue('joinedDate') as string | undefined),
        meta: { viewLabel: t('orgPersonnel.excel.columns.joinedDate') },
    },
    {
        id: 'workYears',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.workYears')} />
        ),
        cell: ({ row }) => {
            const joinedDate = row.getValue('joinedDate') as string | undefined
            const workYears = calculatePersonnelWorkYears(joinedDate)
            return <div className='font-mono text-[10px]'>{workYears || '-'}</div>
        },
        enableSorting: false,
        meta: { viewLabel: t('orgPersonnel.excel.columns.workYears') },
    },
    {
        accessorKey: 'status',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.status')} />
        ),
        cell: ({ row }) => {
            const status = row.getValue('status') as string

            let label = t('orgPersonnel.excel.statuses.active')
            let style = 'bg-emerald-500/10 text-emerald-600'

            if (status === 'resigned') {
                label = t('orgPersonnel.excel.statuses.resigned')
                style = 'bg-slate-500/10 text-slate-500'
            } else if (status === 'on-leave') {
                label = t('orgPersonnel.excel.statuses.onLeave')
                style = 'bg-amber-500/10 text-amber-600'
            }

            return (
                <Badge
                    variant='outline'
                    className={`rounded-full h-5 text-[8px] font-black tracking-widest border-none px-2 ${style}`}
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
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.age')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px]'>{row.getValue('age') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.age') },
    },
    {
        accessorKey: 'idCard',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.idCard')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px] text-muted-foreground/80'>{row.getValue('idCard') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.idCard') },
    },
    {
        accessorKey: 'birthday',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.birthday')} />
        ),
        cell: ({ row }) => renderDateCell(row.getValue('birthday') as string | undefined),
        meta: { viewLabel: t('orgPersonnel.excel.columns.birthday') },
    },
    {
        accessorKey: 'address',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.address')} />
        ),
        cell: ({ row }) => <div className='truncate max-w-[200px] text-[10px] text-muted-foreground'>{row.getValue('address') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.address') },
    },
    {
        accessorKey: 'bankCard',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.bankCard')} />
        ),
        cell: ({ row }) => <div className='font-mono text-[10px] text-muted-foreground/80'>{row.getValue('bankCard') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.bankCard') },
    },
    {
        accessorKey: 'bankName',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.bankName')} />
        ),
        cell: ({ row }) => <div className='truncate max-w-[150px]'>{row.getValue('bankName') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.bankName') },
    },
    {
        accessorKey: 'education',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.excel.columns.education')} />
        ),
        cell: ({ row }) => <div className='text-[10px] font-bold'>{row.getValue('education') || '-'}</div>,
        meta: { viewLabel: t('orgPersonnel.excel.columns.education') },
    },
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('orgPersonnel.org.systemId' as any)} />
        ),
        cell: ({ row }) => {
            const id = row.getValue('id') as string
            return <div className='font-mono text-[9px] text-muted-foreground/30 w-[80px] truncate' title={id}>{id}</div>
        },
        enableSorting: false,
        enableHiding: true,
        meta: { viewable: false },
    },
]

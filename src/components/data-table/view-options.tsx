import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>
  variant?: 'default' | 'industrial'
}

export function DataTableViewOptions<TData>({
  table,
  variant = 'default',
}: DataTableViewOptionsProps<TData>) {
  const { t } = useLanguage()
  const getColumnLabel = (column: ReturnType<Table<TData>['getAllColumns']>[number]) => {
    const meta = column.columnDef.meta as { viewLabel?: string; viewable?: boolean } | undefined
    if (meta?.viewLabel) return meta.viewLabel
    if (typeof column.columnDef.header === 'string') return column.columnDef.header
    return column.id
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === 'industrial' ? (
          <Button
            variant='outline'
            className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
          >
            <div className='flex items-center gap-1'>
              <MixerHorizontalIcon className='size-3 text-blue-600' />
              <span className='text-[10px] font-black tracking-tighter leading-none'>{t('common.table.viewManagement')}</span>
            </div>
            <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest leading-none'>{t('common.table.viewing')}</span>
          </Button>
        ) : (
          <Button
            variant='outline'
            size='sm'
            className='ml-auto hidden h-8 lg:flex rounded-full px-4 text-[11px] font-black uppercase tracking-widest'
          >
            <MixerHorizontalIcon className='mr-2 h-4 w-4' />
            {t('common.table.view')}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[220px] rounded-[32px] border-dashed bg-background/95 backdrop-blur-md shadow-2xl p-2 border-muted/50'>
        <DropdownMenuLabel className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-40 px-4 pt-3 pb-1'>
          <MixerHorizontalIcon className='size-3' />
          {t('common.table.selectColumns')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='bg-muted/30 border-dashed mb-1' />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              column.getCanHide() &&
              (column.columnDef.meta as { viewable?: boolean } | undefined)?.viewable !== false
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className='rounded-2xl py-2 px-3 text-[11px] font-black italic tracking-tighter hover:bg-muted/50 transition-colors cursor-pointer data-[state=checked]:text-blue-600 data-[state=checked]:bg-blue-500/5 transition-all active:scale-95'
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnLabel(column)}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

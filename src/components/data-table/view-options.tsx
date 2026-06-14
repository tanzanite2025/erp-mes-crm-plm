import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>
  variant?: 'default' | 'industrial'
  compact?: boolean
  keepOpenOnItemSelect?: boolean
  contentClassName?: string
  triggerClassName?: string
}

export function DataTableViewOptions<TData>({
  table,
  variant = 'default',
  compact = false,
  keepOpenOnItemSelect = false,
  contentClassName,
  triggerClassName,
}: DataTableViewOptionsProps<TData>) {
  const { t } = useLanguage()
  const getColumnLabel = (
    column: ReturnType<Table<TData>['getAllColumns']>[number]
  ) => {
    const meta = column.columnDef.meta as
      | { viewLabel?: string; viewable?: boolean }
      | undefined
    if (meta?.viewLabel) return meta.viewLabel
    if (typeof column.columnDef.header === 'string')
      return column.columnDef.header
    return column.id
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === 'industrial' ? (
          <Button
            variant='outline'
            className={cn(
              compact
                ? 'flex h-10 w-[105px] items-center justify-center gap-1.5 rounded-xl border-dashed border-muted px-3 shadow-sm transition-all hover:bg-muted active:scale-95'
                : 'flex h-12 w-[105px] flex-col items-center justify-center gap-0.5 rounded-2xl border-dashed border-muted p-0 shadow-sm transition-all hover:bg-muted active:scale-95',
              triggerClassName
            )}
          >
            {compact ? (
              <>
                <MixerHorizontalIcon className='size-3 text-blue-600' />
                <span className='text-[10px] leading-none font-black tracking-tighter'>
                  {t('common.table.viewManagement')}
                </span>
              </>
            ) : (
              <>
                <div className='flex items-center gap-1'>
                  <MixerHorizontalIcon className='size-3 text-blue-600' />
                  <span className='text-[10px] leading-none font-black tracking-tighter'>
                    {t('common.table.viewManagement')}
                  </span>
                </div>
                <span className='font-mono text-[7px] leading-none tracking-widest uppercase opacity-40'>
                  {t('common.table.viewing')}
                </span>
              </>
            )}
          </Button>
        ) : (
          <Button
            variant='outline'
            size='sm'
            className='ml-auto hidden h-8 rounded-full px-4 text-[11px] font-black tracking-widest uppercase lg:flex'
          >
            <MixerHorizontalIcon className='mr-2 h-4 w-4' />
            {t('common.table.view')}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className={cn(
          'w-[220px] rounded-[32px] border-dashed border-muted/50 bg-background/95 p-2 shadow-2xl backdrop-blur-md',
          contentClassName
        )}
      >
        <DropdownMenuLabel className='flex items-center gap-2 px-4 pt-3 pb-1 text-[10px] font-black tracking-widest uppercase opacity-40'>
          <MixerHorizontalIcon className='size-3' />
          {t('common.table.selectColumns')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='mb-1 border-dashed bg-muted/30' />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              column.getCanHide() &&
              (column.columnDef.meta as { viewable?: boolean } | undefined)
                ?.viewable !== false
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className='cursor-pointer rounded-2xl px-3 py-2 text-[11px] font-black tracking-tighter italic transition-all hover:bg-muted/50 active:scale-95 data-[state=checked]:bg-blue-500/5 data-[state=checked]:text-blue-600'
                checked={column.getIsVisible()}
                onSelect={(event) => {
                  if (keepOpenOnItemSelect) {
                    event.preventDefault()
                  }
                }}
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

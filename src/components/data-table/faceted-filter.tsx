import * as React from 'react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  variant?: 'default' | 'industrial'
  subtitle?: string
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  variant = 'default',
  subtitle,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(column?.getFilterValue() as string[])

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === 'industrial' ? (
          <Button
            variant='outline'
            className='w-[105px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
          >
            <div className='flex items-center gap-1.5'>
              <PlusCircledIcon className='size-3 text-blue-600' />
              <span className='text-[10px] font-black tracking-tighter leading-none'>{title}</span>
              {selectedValues?.size > 0 && (
                <Badge
                  variant='secondary'
                  className='h-3.5 rounded-full px-1 text-[8px] font-mono bg-blue-500/10 text-blue-600 border-none ml-1'
                >
                  {selectedValues.size}
                </Badge>
              )}
            </div>
            {subtitle && (
              <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest leading-none'>{subtitle}</span>
            )}
          </Button>
        ) : (
          <Button variant='outline' size='sm' className='h-8 border-dashed'>
            <PlusCircledIcon className='size-4' />
            {title}
            {selectedValues?.size > 0 && (
              <>
                <Separator orientation='vertical' className='mx-2 h-4' />
                <Badge
                  variant='secondary'
                  className='rounded-sm px-1 font-normal lg:hidden'
                >
                  {selectedValues.size}
                </Badge>
                <div className='hidden space-x-1 lg:flex'>
                  {selectedValues.size > 2 ? (
                    <Badge
                      variant='secondary'
                      className='rounded-sm px-1 font-normal'
                    >
                      {selectedValues.size} selected
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          variant='secondary'
                          key={option.value}
                          className='rounded-sm px-1 font-normal'
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className='w-[220px] rounded-[24px] border border-dashed border-muted/40 p-0 shadow-2xl' align='start'>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    className='mx-1 my-0.5 rounded-xl px-3 py-2 text-[10px] font-black tracking-wide'
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      const filterValues = Array.from(selectedValues)
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                      )
                    }}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-xl border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className={cn('h-4 w-4 text-background')} />
                    </div>
                    {option.icon && (
                      <option.icon className='size-4 text-muted-foreground' />
                    )}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className='ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs'>
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className='mx-1 my-1 justify-center rounded-xl px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest'
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

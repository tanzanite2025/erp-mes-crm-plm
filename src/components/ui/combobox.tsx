'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ComboboxProps {
  options: {
    label: string
    value: string
    keywords?: string
    secondaryLabel?: string
    tertiaryLabel?: string
    usageStats?: { stage: string; percentage: number }[] // 新增：使用占比统计
    [key: string]: unknown
  }[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  contentClassName?: string
  disabled?: boolean
  isLoading?: boolean
  variant?: 'default' | 'industrial'
}

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索名称、规格或编码...',
  emptyText = '未找到结果',
  className,
  contentClassName,
  disabled,
  isLoading,
  variant = 'default',
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!deferredSearch) return options
    const s = deferredSearch.toLowerCase().trim()
    if (!s) return options
    return options.filter((o) => {
      const targetStr = `${o.label} ${o.secondaryLabel ?? ''} ${o.keywords ?? ''}`
      return targetStr.toLowerCase().includes(s)
    })
  }, [options, deferredSearch])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'industrial' ? (
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20',
              className
            )}
          >
            <span className='truncate text-left'>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-40' />
          </Button>
        ) : (
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-8 w-full justify-between px-2 text-xs font-normal',
              className
            )}
          >
            <span className='truncate text-left'>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className='ml-2 h-3 w-3 shrink-0 opacity-50' />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-blue-500/20 p-0 shadow-2xl sm:w-[580px] sm:max-w-[580px]',
          contentClassName
        )}
        align='start'
        collisionPadding={8}
      >
        <Command filter={() => 1}>
          <div className='flex items-center border-b bg-muted/20 px-3 text-blue-600'>
            <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
            <CommandInput
              placeholder={searchPlaceholder}
              className='h-9 border-none text-xs outline-none focus:ring-0'
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <CommandList className='relative max-h-[48dvh] min-h-[12rem] w-full overflow-y-auto sm:max-h-[400px] sm:min-h-[300px]'>
            {isLoading ? (
              <div className='animate-pulse py-12 text-center text-xs font-black tracking-widest text-muted-foreground uppercase sm:py-20'>
                Loading Archive / 数据加载中...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className='px-4 py-12 text-center text-xs text-muted-foreground sm:py-20'>
                <div
                  data-slot='combobox-empty-title'
                  className='mb-1 font-black tracking-tight uppercase'
                >
                  {emptyText}
                </div>
                <div
                  data-slot='combobox-empty-subtitle'
                  className='truncate text-[10px] uppercase opacity-40'
                >
                  No matching records found
                </div>
              </div>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.secondaryLabel ?? ''} ${option.keywords ?? ''}`}
                    className='mb-1 flex w-full cursor-pointer items-center justify-between py-2 text-xs hover:bg-slate-50'
                    onSelect={() => {
                      onValueChange(option.value === value ? '' : option.value)
                      setOpen(false)
                    }}
                  >
                    <div className='flex flex-1 items-center gap-3 overflow-hidden'>
                      <Check
                        className={cn(
                          'h-3 w-3 shrink-0',
                          value === option.value
                            ? 'text-blue-500 opacity-100'
                            : 'opacity-0'
                        )}
                      />

                      {/* 左侧：核心信息 */}
                      <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
                        <div className='flex w-full items-center justify-between'>
                          <span
                            data-slot='combobox-option-label'
                            className='truncate font-bold text-slate-700'
                          >
                            {option.label}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          {option.secondaryLabel && (
                            <div className='flex shrink-0 items-center gap-1'>
                              <span
                                data-slot='combobox-option-secondary-badge'
                                className='rounded bg-emerald-50 px-0.5 text-[9px] font-black tracking-tight text-emerald-600 uppercase'
                              >
                                规格
                              </span>
                              <span
                                data-slot='combobox-option-secondary-text'
                                className='max-w-[150px] truncate text-[10px] font-bold text-emerald-600'
                              >
                                {option.secondaryLabel}
                              </span>
                            </div>
                          )}
                          {option.tertiaryLabel && (
                            <span
                              data-slot='combobox-option-tertiary'
                              className='shrink-0 font-mono text-[10px] italic opacity-30'
                            >
                              #{option.tertiaryLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 右侧：统计与推荐度 (隔离显示) */}
                      <div className='ml-auto flex shrink-0 items-center gap-2 border-l border-slate-100 pl-3'>
                        {option.usageStats && option.usageStats.length > 0 ? (
                          <div className='flex gap-1.5'>
                            {option.usageStats.slice(0, 2).map((stat, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  'flex min-w-[50px] flex-col items-center justify-center rounded border px-1.5 py-0.5',
                                  stat.percentage > 50
                                    ? 'border-blue-100 bg-blue-50 text-blue-700'
                                    : 'border-slate-100 bg-slate-50 text-slate-500'
                                )}
                              >
                                <span
                                  data-slot='combobox-option-stats-stage'
                                  className='mb-0.5 text-[9px] leading-none font-bold'
                                >
                                  {stat.stage}
                                </span>
                                <span
                                  data-slot='combobox-option-stats-value'
                                  className='text-[10px] leading-none font-black'
                                >
                                  {stat.percentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span
                            data-slot='combobox-option-stats-empty'
                            className='text-[10px] text-slate-300 italic'
                          >
                            标准档案
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

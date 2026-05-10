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
    label: string; 
    value: string; 
    keywords?: string; 
    secondaryLabel?: string; 
    tertiaryLabel?: string;
    usageStats?: { stage: string; percentage: number }[]; // 新增：使用占比统计
    [key: string]: any 
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
  const selectedOption = React.useMemo(() => 
    options.find((opt) => opt.value === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!deferredSearch) return options
    const s = deferredSearch.toLowerCase().trim()
    if (!s) return options
    return options.filter(o => {
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
              'w-full h-11 rounded-2xl bg-muted/50 border-none shadow-inner flex items-center justify-between px-4 text-xs font-bold transition-all focus-visible:ring-primary/20',
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
            className={cn('w-full justify-between h-8 px-2 text-xs font-normal', className)}
          >
            <span className='truncate text-left'>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className='ml-2 h-3 w-3 shrink-0 opacity-50' />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={cn('w-[580px] p-0 shadow-2xl border-blue-500/20', contentClassName)} align='start'>
        <Command filter={() => 1}>
          <div className='flex items-center border-b px-3 text-blue-600 bg-muted/20'>
            <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
            <CommandInput 
                placeholder={searchPlaceholder} 
                className='h-9 outline-none border-none focus:ring-0 text-xs'
                value={search}
                onValueChange={setSearch}
            />
          </div>
          <CommandList className='min-h-[300px] max-h-[400px] overflow-y-auto w-full relative'>
            {isLoading ? (
              <div className='py-20 text-center text-xs text-muted-foreground animate-pulse font-black uppercase tracking-widest'>
                Loading Archive / 数据加载中...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className='py-20 text-center text-xs text-muted-foreground'>
                  <div data-slot='combobox-empty-title' className='font-black uppercase tracking-tight mb-1'>{emptyText}</div>
                  <div data-slot='combobox-empty-subtitle' className='text-[10px] opacity-40 uppercase'>No matching records found</div>
              </div>
            ) : (
                <CommandGroup>
                {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.secondaryLabel ?? ''} ${option.keywords ?? ''}`}
                      className='text-xs flex items-center justify-between py-2 cursor-pointer hover:bg-slate-50 w-full mb-1'
                      onSelect={() => {
                        onValueChange(option.value === value ? '' : option.value)
                        setOpen(false)
                      }}
                    >
                      <div className='flex items-center flex-1 overflow-hidden gap-3'>
                        <Check
                            className={cn(
                            'shrink-0 h-3 w-3',
                            value === option.value ? 'opacity-100 text-blue-500' : 'opacity-0'
                            )}
                        />
                        
                        {/* 左侧：核心信息 */}
                        <div className='flex flex-col gap-0.5 overflow-hidden flex-1'>
                            <div className='flex items-center justify-between w-full'>
                                <span data-slot='combobox-option-label' className='truncate font-bold text-slate-700'>{option.label}</span>
                            </div>
                            <div className='flex items-center gap-2'>
                              {option.secondaryLabel && (
                                    <div className='flex items-center gap-1 shrink-0'>
                                        <span data-slot='combobox-option-secondary-badge' className='text-[9px] bg-emerald-50 text-emerald-600 px-0.5 rounded font-black uppercase tracking-tight'>
                                            规格
                                        </span>
                                        <span data-slot='combobox-option-secondary-text' className='text-[10px] text-emerald-600 font-bold truncate max-w-[150px]'>
                                            {option.secondaryLabel}
                                        </span>
                                    </div>
                                )}
                                {option.tertiaryLabel && (
                                    <span data-slot='combobox-option-tertiary' className='text-[10px] font-mono opacity-30 shrink-0 italic'>
                                        #{option.tertiaryLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 右侧：统计与推荐度 (隔离显示) */}
                        <div className='flex items-center gap-2 shrink-0 border-l pl-3 ml-auto border-slate-100'>
                            {option.usageStats && option.usageStats.length > 0 ? (
                                <div className='flex gap-1.5'>
                                    {option.usageStats.slice(0, 2).map((stat, idx) => (
                                        <div 
                                            key={idx} 
                                            className={cn(
                                                'flex flex-col items-center justify-center px-1.5 py-0.5 rounded border min-w-[50px]',
                                                stat.percentage > 50 
                                                    ? 'bg-blue-50 border-blue-100 text-blue-700' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-500'
                                            )}
                                        >
                                            <span data-slot='combobox-option-stats-stage' className='text-[9px] font-bold leading-none mb-0.5'>{stat.stage}</span>
                                            <span data-slot='combobox-option-stats-value' className='text-[10px] font-black leading-none'>{stat.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span data-slot='combobox-option-stats-empty' className='text-[10px] text-slate-300 italic'>标准档案</span>
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

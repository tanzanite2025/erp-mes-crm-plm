import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getKnowledgeRouteOptions } from '@/components/layout/data/search-data'
import { normalizeSearchHref } from '@/components/layout/data/search-href'

interface CommandTargetLinkPickerProps {
  value: string
  onChange: (value: string) => void
  onValidityChange?: (valid: boolean) => void
}

export function CommandTargetLinkPicker({
  value,
  onChange,
  onValidityChange,
}: CommandTargetLinkPickerProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const normalizedValue = normalizeSearchHref(value)

  const routeOptions = useMemo(() => getKnowledgeRouteOptions(t), [t])
  const routeOptionsForSelect = useMemo(() => {
    const currentRouteOption = routeOptions.find(
      (option) => option.value === normalizedValue
    )

    if (currentRouteOption || !normalizedValue) {
      return routeOptions
    }

    return [
      ...routeOptions,
      {
        value: normalizedValue,
        label: '当前旧链接（未纳入结构化映射）',
        parentLabel: '历史模板',
      },
    ]
  }, [normalizedValue, routeOptions])
  const selectedRouteOption = useMemo(
    () =>
      routeOptionsForSelect.find(
        (option) => option.value === normalizedValue
      ) ?? null,
    [normalizedValue, routeOptionsForSelect]
  )
  const hasUnmappedValue =
    Boolean(normalizedValue) &&
    !routeOptions.some((option) => option.value === normalizedValue)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()
    return routeOptionsForSelect.filter((option) => {
      if (normalizedQuery === '') return true

      return [option.label, option.parentLabel, option.value]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [routeOptionsForSelect, searchTerm])

  useEffect(() => {
    onValidityChange?.(!hasUnmappedValue)
  }, [hasUnmappedValue, onValidityChange])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearchTerm('')
    }
  }

  const handleRouteSelect = (nextValue: string) => {
    onChange(normalizeSearchHref(nextValue))
    setOpen(false)
    setSearchTerm('')
  }

  return (
    <div className='space-y-2'>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='h-12 w-full justify-between rounded-2xl border-none bg-muted/50 px-4 text-left text-[13px] font-bold shadow-inner hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/20'
          >
            <div className='min-w-0 flex-1 text-left'>
              <div
                className={cn(
                  'truncate text-[13px] font-bold',
                  !selectedRouteOption && 'text-muted-foreground'
                )}
              >
                {selectedRouteOption
                  ? `${selectedRouteOption.label} / ${selectedRouteOption.parentLabel}`
                  : '请选择关联页面'}
              </div>
            </div>
            <ChevronsUpDown className='ml-3 size-4 shrink-0 opacity-45' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side='right'
          align='center'
          sideOffset={10}
          alignOffset={0}
          avoidCollisions
          collisionPadding={32}
          className='z-170 rounded-[24px] border-dashed border-muted/50 bg-background p-0 shadow-2xl'
          style={{
            width:
              'min(440px, calc(100vw - 5rem), var(--radix-popover-content-available-width))',
            maxWidth: 'calc(100vw - 5rem)',
          }}
        >
          <div className='border-b border-dashed border-muted/50 bg-muted/10 p-2.5'>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/45' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='搜索页面名称、模块或路径'
                className='h-9 rounded-2xl border-none bg-muted/50 pl-9 text-[11px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
          </div>
          <div className='border-b border-dashed border-muted/50 p-2.5'>
            <button
              type='button'
              onClick={() => handleRouteSelect('')}
              className={cn(
                'flex w-full items-center justify-between rounded-[18px] border border-dashed px-3.5 py-2.5 text-left transition-colors',
                !normalizedValue
                  ? 'border-primary/50 bg-primary/5 text-primary'
                  : 'border-muted/50 bg-muted/10 hover:bg-muted/30'
              )}
            >
              <span className='text-[11px] font-black tracking-widest uppercase'>
                暂不设置跳转
              </span>
              <Check
                className={cn(
                  'size-4',
                  !normalizedValue ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          </div>
          <div className='max-h-[min(60vh,420px)] overflow-y-auto p-2.5'>
            {filteredOptions.length === 0 ? (
              <div className='flex min-h-24 items-center justify-center rounded-[18px] border border-dashed border-muted/50 bg-muted/10 px-4 text-center'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  当前筛选下暂无匹配页面
                </span>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => handleRouteSelect(option.value)}
                    className={cn(
                      'group flex flex-col rounded-[16px] border border-dashed px-3 py-2 text-left transition-colors',
                      normalizedValue === option.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-muted/50 bg-muted/10 hover:bg-muted/30'
                    )}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 space-y-0.5'>
                        <div className='truncate text-[12px] leading-none font-black tracking-tight'>
                          {option.label}
                        </div>
                        <div className='truncate text-[8px] leading-none font-black tracking-[0.14em] text-muted-foreground/55 uppercase'>
                          {option.parentLabel}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'size-4 shrink-0 transition-opacity',
                          normalizedValue === option.value
                            ? 'text-primary opacity-100'
                            : 'text-muted-foreground opacity-0 group-hover:opacity-40'
                        )}
                      />
                    </div>
                    <div className='mt-1 truncate font-mono text-[8px] leading-none text-muted-foreground/70'>
                      {option.value}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedRouteOption ? (
        <div className='rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3'>
          <div className='text-[10px] font-black tracking-widest text-primary uppercase'>
            已选择跳转目标
          </div>
          <div className='mt-2 space-y-1'>
            <div className='text-[11px] font-black text-foreground'>
              {selectedRouteOption.label}
            </div>
            <div className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              {selectedRouteOption.parentLabel}
            </div>
            <div className='font-mono text-[8px] text-muted-foreground'>
              {selectedRouteOption.value}
            </div>
          </div>
        </div>
      ) : null}

      {hasUnmappedValue ? (
        <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[10px] font-black text-rose-700'>
          当前模板上的跳转链接属于历史旧值，请在弹层中重新选择规范化页面目标后再保存。
        </div>
      ) : null}
    </div>
  )
}

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import type { HierarchyLevelOptionItem } from '../data/hierarchy-config'

type HierarchyOptionDropdownButtonProps = {
  options: HierarchyLevelOptionItem[]
  onSelect: (option: HierarchyLevelOptionItem) => void
  children: ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  align?: 'start' | 'center' | 'end'
}

export function HierarchyOptionDropdownButton({
  options,
  onSelect,
  children,
  className,
  variant = 'outline',
  size = 'sm',
  align = 'center',
}: HierarchyOptionDropdownButtonProps) {
  const { locale } = useLanguage()
  const emptyText = locale === 'zh-CN'
    ? '暂无候选项，请先到“层级配置”中维护。'
    : 'No options yet. Please configure them in Hierarchy Config first.'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn(className)}>
          {children}
          <ChevronDown className='ml-2 size-3.5 shrink-0' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className='w-72 rounded-[22px] border border-dashed border-muted/40 bg-background/95 p-1 shadow-2xl backdrop-blur-md'>
        {options.length > 0 ? (
          options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onSelect(option)}
              className='cursor-pointer rounded-xl px-4 py-3 text-[11px] font-bold tracking-[0.08em]'
            >
              {option.name}
            </DropdownMenuItem>
          ))
        ) : (
          <div className='px-4 py-3 text-[11px] font-bold leading-relaxed text-muted-foreground'>
            {emptyText}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

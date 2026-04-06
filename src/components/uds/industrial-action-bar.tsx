import { type ReactNode } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface IndustrialActionBarProps {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  leftContent?: ReactNode
  rightContent?: ReactNode
  className?: string
}

export function IndustrialActionBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing,
  leftContent,
  rightContent,
  className
}: IndustrialActionBarProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5 p-6 rounded-[24px] border border-dashed border-muted/50 shadow-inner overflow-hidden',
      className
    )}>
      <div className='flex items-center gap-4 flex-1 w-full'>
        {onSearchChange && (
          <div className='relative w-full sm:w-96 group'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
            <Input 
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              className='pl-10 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20 w-full'
            />
          </div>
        )}
        {leftContent}
      </div>

      <div className='flex items-center gap-2 w-full sm:w-auto'>
        {onRefresh && (
          <Button 
            variant='outline' 
            size='icon'
            onClick={onRefresh}
            className='size-11 rounded-full border-dashed border-muted-foreground/20 text-muted-foreground hover:text-primary transition-all active:scale-95'
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
          </Button>
        )}
        {rightContent}
      </div>
    </div>
  )
}

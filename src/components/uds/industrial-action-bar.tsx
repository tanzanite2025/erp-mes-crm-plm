import { type ReactNode } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  className,
}: IndustrialActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-6 shadow-inner sm:flex-row',
        className
      )}
    >
      <div className='flex w-full flex-1 items-center gap-4'>
        {onSearchChange && (
          <div className='group relative w-full sm:w-96'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className='h-12 w-full rounded-2xl border-none bg-background pl-10 text-sm font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>
        )}
        {leftContent}
      </div>

      <div className='flex w-full items-center gap-2 sm:w-auto'>
        {onRefresh && (
          <Button
            variant='outline'
            size='icon'
            onClick={onRefresh}
            className='size-11 rounded-full border-dashed border-muted-foreground/20 text-muted-foreground transition-all hover:text-primary active:scale-95'
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        )}
        {rightContent}
      </div>
    </div>
  )
}

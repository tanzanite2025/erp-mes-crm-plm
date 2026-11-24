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
        'flex min-w-0 shrink-0 flex-col flex-wrap items-center justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-6 shadow-inner sm:flex-row',
        className
      )}
    >
      <div className='flex w-full min-w-0 flex-1 flex-wrap items-center gap-4 sm:basis-72'>
        {onSearchChange && (
          <div className='group relative min-w-0 flex-1 basis-48 sm:max-w-96'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className='h-12 w-full rounded-2xl border-none bg-background pl-10 shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>
        )}
        {leftContent}
      </div>

      <div className='flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto'>
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

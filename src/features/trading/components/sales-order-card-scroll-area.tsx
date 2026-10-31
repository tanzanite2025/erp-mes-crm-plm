import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function SalesOrderCardScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ScrollArea
      className={cn(
        'min-w-0 rounded-3xl border border-border/60 bg-muted/60',
        className
      )}
    >
      <div className='space-y-4 p-3 pr-4 pb-5 sm:p-4 sm:pr-5 sm:pb-6'>
        {children}
      </div>
    </ScrollArea>
  )
}

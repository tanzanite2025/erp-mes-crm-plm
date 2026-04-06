import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-primary/10',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full bg-primary transition-all duration-500 ease-in-out',
            indicatorClassName
          )}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }

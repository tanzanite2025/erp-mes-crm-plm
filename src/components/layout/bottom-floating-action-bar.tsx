import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BottomFloatingActionBarProps = HTMLAttributes<HTMLDivElement>

export const BottomFloatingActionBar = forwardRef<
  HTMLDivElement,
  BottomFloatingActionBarProps
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'pointer-events-auto fixed z-[90] -translate-x-1/2',
      'max-w-[calc(100vw-1.5rem)]',
      className
    )}
    style={{
      left: 'calc((100% + var(--header-fixed-left, 0px) - var(--header-fixed-right, 0px)) / 2)',
      maxWidth:
        'calc(100vw - var(--header-fixed-left, 0px) - var(--header-fixed-right, 0px) - 1.5rem)',
      bottom: 'calc(env(safe-area-inset-bottom) + 5.75rem)',
      ...style,
    }}
    {...props}
  />
))

BottomFloatingActionBar.displayName = 'BottomFloatingActionBar'

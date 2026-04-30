import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlobalBottomDockProps {
  children: ReactNode
}

export function GlobalBottomDock({ children }: GlobalBottomDockProps) {
  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-3 z-[100] flex items-center justify-center px-4'>
      <div
        className={cn(
          'pointer-events-auto flex min-w-0 items-center justify-center gap-3 rounded-full border border-border/70 bg-background/95 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-xl',
          'supports-[backdrop-filter]:bg-background/80'
        )}
      >
        {children}
      </div>
    </div>
  )
}

import * as React from 'react'
import { cn } from '@/lib/utils'

interface StandardPreviewInfoCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  className?: string
  valueClassName?: string
  highlight?: boolean
}

export function StandardPreviewInfoCard({
  icon: Icon,
  label,
  value,
  className,
  valueClassName,
  highlight = false,
}: StandardPreviewInfoCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/5 bg-background/60 p-2.5 shadow-sm lg:rounded-2xl lg:p-3',
        className
      )}
    >
      <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 lg:size-10 lg:rounded-xl'>
        <Icon className='size-3 text-primary/40 lg:size-4' />
      </div>
      <div className='min-w-0'>
        <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase lg:text-[9px]'>
          {label}
        </p>
        <p
          className={cn(
            'truncate text-xs font-bold tracking-tight lg:text-sm',
            valueClassName,
            highlight && 'tracking-wider text-primary uppercase'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

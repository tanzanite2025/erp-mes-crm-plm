import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IndustrialHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  statusBadge?: ReactNode
  className?: string
  innerClassName?: string
  gradient?: boolean
}

export function IndustrialHeader({
  icon: Icon,
  title,
  description,
  statusBadge,
  className,
  innerClassName,
  gradient = false,
}: IndustrialHeaderProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm md:p-5',
        className
      )}
    >
      {gradient && (
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      )}

      <div
        className={cn('flex items-center gap-2 text-primary', innerClassName)}
      >
        <Icon className='size-5' />
        <h3 className='text-lg font-semibold tracking-tight'>{title}</h3>
      </div>

      <div className='flex flex-col justify-between gap-2 md:flex-row md:items-center'>
        {description && (
          <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
            {description}
          </p>
        )}
        {statusBadge}
      </div>
    </div>
  )
}

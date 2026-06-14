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
        'relative flex flex-col gap-1.5 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-5',
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
        <h3 className='text-base font-black tracking-tighter uppercase italic'>
          {title}
        </h3>
      </div>

      <div className='flex flex-col justify-between gap-2 md:flex-row md:items-center'>
        {description && (
          <p className='max-w-2xl text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {description}
          </p>
        )}
        {statusBadge}
      </div>
    </div>
  )
}

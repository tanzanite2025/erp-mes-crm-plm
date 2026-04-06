import { type ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
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
    <div className={cn(
      'flex flex-col gap-2 bg-muted/5 p-6 md:p-8 rounded-[32px] border border-dashed border-muted/50 relative overflow-hidden',
      className
    )}>
      {gradient && (
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
      )}
      
      <div className={cn('flex items-center gap-2 text-primary', innerClassName)}>
        <Icon className='size-5' />
        <h3 className='text-lg font-black tracking-tighter italic uppercase'>
          {title}
        </h3>
      </div>

      <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
        {description && (
          <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 max-w-2xl'>
            {description}
          </p>
        )}
        {statusBadge}
      </div>
    </div>
  )
}

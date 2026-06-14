import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex animate-in flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/40 bg-muted/5 p-12 text-center duration-700 fade-in zoom-in',
        className
      )}
    >
      <div className='group relative mb-6 rounded-full bg-muted/10 p-5'>
        <div className='absolute inset-0 rounded-full bg-primary/5 opacity-0 blur-xl transition-opacity group-hover:opacity-100' />
        <Icon className='relative z-10 size-10 text-muted-foreground/40' />
      </div>

      {/* UDS 1.0 一级标题规范 */}
      <h3 className='mb-2 text-lg font-black tracking-tighter text-slate-800 uppercase italic'>
        {title}
      </h3>

      {/* UDS 1.0 辅助描述规范 */}
      <p className='mb-8 max-w-[420px] text-[10px] leading-loose font-black tracking-widest text-muted-foreground/60 uppercase'>
        {description}
      </p>

      {action && (
        <div className='animate-in duration-1000 slide-in-from-bottom-2'>
          {action}
        </div>
      )}
    </div>
  )
}

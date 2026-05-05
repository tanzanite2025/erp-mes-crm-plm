import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-12 rounded-[32px] border border-dashed border-muted/40 bg-muted/5 text-center animate-in fade-in zoom-in duration-700',
      className
    )}>
      <div className='p-5 rounded-full bg-muted/10 mb-6 relative group'>
        <div className='absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity' />
        <Icon className='size-10 text-muted-foreground/40 relative z-10' />
      </div>
      
      {/* UDS 1.0 一级标题规范 */}
      <h3 className='text-lg font-black tracking-tighter italic uppercase text-slate-800 mb-2'>
        {title}
      </h3>
      
      {/* UDS 1.0 辅助描述规范 */}
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 max-w-[420px] mb-8 leading-loose'>
        {description}
      </p>
      
      {action && <div className='animate-in slide-in-from-bottom-2 duration-1000'>{action}</div>}
    </div>
  )
}

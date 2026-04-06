import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl border-muted/50 bg-muted/10 text-center animate-in fade-in zoom-in duration-500'>
      <div className='p-4 rounded-full bg-muted/20 mb-4'>
        <Icon className='size-10 text-muted-foreground/60' />
      </div>
      <h3 className='text-lg font-bold tracking-tight mb-2'>{title}</h3>
      <p className='text-sm text-muted-foreground max-w-[320px] mb-6'>
        {description}
      </p>
      {action && action}
    </div>
  )
}

import type { ComponentProps } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function FloatingSurfaceCloseButton({
  className,
  'aria-label': accessibleLabel = 'Close',
  title = accessibleLabel,
  ...props
}: Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <Button
      type='button'
      variant='secondary'
      size='icon'
      aria-label={accessibleLabel}
      title={title}
      className={cn(
        'size-9 rounded-full border border-border bg-secondary text-secondary-foreground opacity-100 shadow-xs transition-colors hover:border-ring hover:bg-primary/10 hover:text-foreground active:bg-primary/15',
        className
      )}
      {...props}
    >
      <XIcon className='size-4.5' strokeWidth={2.25} />
    </Button>
  )
}

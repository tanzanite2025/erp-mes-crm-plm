import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface OutsourceStatCardProps {
  label: ReactNode
  value: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
}

export function OutsourceStatCard({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: OutsourceStatCardProps) {
  return (
    <Card
      className={cn(
        'rounded-[22px] border-dashed bg-muted/5 shadow-none',
        className
      )}
    >
      <CardContent className='flex items-center justify-between p-4'>
        <span
          className={cn(
            'text-[10px] font-black tracking-widest text-muted-foreground uppercase',
            labelClassName
          )}
        >
          {label}
        </span>
        <span
          className={cn('text-2xl font-black tabular-nums', valueClassName)}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

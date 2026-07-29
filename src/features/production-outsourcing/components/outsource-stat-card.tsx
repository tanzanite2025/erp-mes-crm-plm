import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  industrialPanelClassName,
  industrialPanelGradientClassName,
} from '@/components/uds/industrial-panel'

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
        industrialPanelClassName,
        'gap-0 py-0 sm:gap-6 sm:py-6',
        className
      )}
    >
      <div className={industrialPanelGradientClassName} />
      <CardContent className='relative z-10 flex min-h-0 items-center justify-between p-3 sm:p-4'>
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground',
            labelClassName
          )}
        >
          {label}
        </span>
        <span
          className={cn('text-2xl font-semibold tabular-nums', valueClassName)}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

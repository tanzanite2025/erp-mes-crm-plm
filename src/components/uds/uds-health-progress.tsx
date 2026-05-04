import type { ReactNode } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type UdsHealthProgressTone = 'healthy' | 'alert' | 'critical'

interface UdsHealthProgressProps {
  label: ReactNode
  value: number
  valueLabel?: ReactNode
  footer?: ReactNode
  className?: string
  criticalThreshold?: number
  alertThreshold?: number
  tone?: UdsHealthProgressTone
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function resolveTone(
  value: number,
  criticalThreshold: number,
  alertThreshold: number,
): UdsHealthProgressTone {
  if (value < criticalThreshold) {
    return 'critical'
  }
  if (value < alertThreshold) {
    return 'alert'
  }
  return 'healthy'
}

const toneClassMap: Record<
  UdsHealthProgressTone,
  {
    value: string
    indicator: string
  }
> = {
  healthy: {
    value: 'text-primary',
    indicator: 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  },
  alert: {
    value: 'text-amber-600',
    indicator: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]',
  },
  critical: {
    value: 'text-rose-600',
    indicator: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
}

export function UdsHealthProgress({
  label,
  value,
  valueLabel,
  footer,
  className,
  criticalThreshold = 20,
  alertThreshold = 50,
  tone,
}: UdsHealthProgressProps) {
  const percent = clampPercent(value)
  const resolvedTone = tone || resolveTone(percent, criticalThreshold, alertThreshold)
  const toneClasses = toneClassMap[resolvedTone]

  return (
    <div className={cn('rounded-[24px] border border-dashed bg-muted/5 p-4 space-y-3 relative z-10', className)}>
      <div className='flex items-center justify-between text-[9px] font-black uppercase tracking-widest'>
        <span className='text-muted-foreground/40'>{label}</span>
        <span className={toneClasses.value}>{valueLabel ?? `${percent}%`}</span>
      </div>
      <Progress
        value={percent}
        className='h-1 w-full rounded-full bg-muted/30 overflow-hidden'
        indicatorClassName={cn('transition-all duration-1000', toneClasses.indicator)}
      />
      {footer ? (
        <div className='flex justify-between items-center gap-4 flex-wrap'>
          {footer}
        </div>
      ) : null}
    </div>
  )
}

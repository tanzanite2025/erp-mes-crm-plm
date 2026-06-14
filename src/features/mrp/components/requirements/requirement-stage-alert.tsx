'use client'

import { cn } from '@/lib/utils'

interface RequirementStageAlertProps {
  tone: 'warning' | 'error'
  title: string
  description: string
  details?: string
}

const toneClassNameMap: Record<RequirementStageAlertProps['tone'], string> = {
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
}

const detailToneClassNameMap: Record<
  RequirementStageAlertProps['tone'],
  string
> = {
  warning: 'text-amber-700',
  error: 'text-rose-700',
}

export function RequirementStageAlert({
  tone,
  title,
  description,
  details,
}: RequirementStageAlertProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-sm',
        toneClassNameMap[tone]
      )}
    >
      <div className='text-[10px] font-black tracking-[0.2em] uppercase'>
        {title}
      </div>
      <div
        className={cn(
          'mt-2 text-xs leading-6 font-medium',
          detailToneClassNameMap[tone]
        )}
      >
        {description}
      </div>
      {details ? (
        <div className='mt-3 text-sm leading-6 font-bold'>{details}</div>
      ) : null}
    </div>
  )
}

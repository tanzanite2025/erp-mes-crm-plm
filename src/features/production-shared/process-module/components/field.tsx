import { cn } from '@/lib/utils'
import type { ProcessFieldConfig } from '../config'

type ProcessModuleFieldProps = {
  field: ProcessFieldConfig
}

const widthClassName: Record<
  NonNullable<ProcessFieldConfig['width']>,
  string
> = {
  sm: 'sm:col-span-1',
  md: 'sm:col-span-1 lg:col-span-1',
  lg: 'sm:col-span-2 lg:col-span-2',
}

export function ProcessModuleField({ field }: ProcessModuleFieldProps) {
  const toneClassName =
    field.tone === 'danger'
      ? 'text-rose-700'
      : field.tone === 'accent'
        ? 'text-cyan-700'
        : 'text-foreground'

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-muted/40 bg-muted/20 px-3 py-2',
        field.width ? widthClassName[field.width] : 'sm:col-span-1'
      )}
    >
      <p className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
        {field.label}
      </p>
      <p className={cn('text-sm font-semibold', toneClassName)}>
        {field.value}
      </p>
    </div>
  )
}

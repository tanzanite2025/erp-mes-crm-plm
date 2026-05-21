import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import type { CuttingEngineConfig } from '../types'

export type CuttingEnginePhysicalConstraintValues = Pick<
  CuttingEngineConfig,
  'knifeGapMm' | 'edgeTrimMm' | 'maxSolveDurationSeconds'
>

type CuttingEnginePhysicalConstraintKey = keyof CuttingEnginePhysicalConstraintValues

type CuttingEnginePhysicalConstraintsPanelProps = {
  values: CuttingEnginePhysicalConstraintValues
  onChange: (key: CuttingEnginePhysicalConstraintKey, value: string) => void
  variant?: 'rows' | 'grid'
  className?: string
}

const PHYSICAL_CONSTRAINT_FIELDS = [
  {
    key: 'knifeGapMm',
    label: 'rawMaterials.engineConfig.constraints.knifeGap.label',
    hint: 'rawMaterials.engineConfig.constraints.knifeGap.hint',
    unit: 'rawMaterials.engineConfig.constraints.units.mm',
    placeholder: '2.0',
  },
  {
    key: 'edgeTrimMm',
    label: 'rawMaterials.engineConfig.constraints.edgeTrim.label',
    hint: 'rawMaterials.engineConfig.constraints.edgeTrim.hint',
    unit: 'rawMaterials.engineConfig.constraints.units.mm',
    placeholder: '10.0',
  },
  {
    key: 'maxSolveDurationSeconds',
    label: 'rawMaterials.engineConfig.constraints.timeout.label',
    hint: 'rawMaterials.engineConfig.constraints.timeout.hint',
    unit: 'rawMaterials.engineConfig.constraints.units.sec',
    placeholder: '30',
  },
] as const

export function CuttingEnginePhysicalConstraintsPanel(props: CuttingEnginePhysicalConstraintsPanelProps) {
  const { values, onChange, variant = 'rows', className } = props
  const { t } = useLanguage()
  const containerClassName = className ?? (variant === 'grid' ? 'grid grid-cols-1 gap-2 md:grid-cols-3' : 'flex flex-col gap-4')
  const inputClassName = variant === 'grid'
    ? 'h-8 rounded-lg bg-background text-xs font-semibold'
    : 'h-10 w-24 rounded-lg border-none bg-background pr-3 text-right font-mono text-xs'

  return (
    <div className={containerClassName}>
      {PHYSICAL_CONSTRAINT_FIELDS.map((item) => (
        <div
          key={item.key}
          className={variant === 'grid'
            ? 'rounded-[14px] border border-dashed border-primary/15 bg-background/70 p-3'
            : 'flex items-center justify-between gap-4'}
        >
          <div className='flex flex-col'>
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
              {t(item.label)}
            </span>
            <span className='mt-0.5 text-[8px] font-mono text-muted-foreground/60'>
              {t(item.hint)}
            </span>
          </div>
          <div className={variant === 'grid' ? 'mt-2 flex items-center gap-2' : 'flex items-center gap-2'}>
            <Input
              type='text'
              value={values[item.key]}
              onChange={(event) => onChange(item.key, event.target.value)}
              className={inputClassName}
              placeholder={item.placeholder}
            />
            <span className='text-[10px] font-black text-muted-foreground/50'>
              {t(item.unit)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

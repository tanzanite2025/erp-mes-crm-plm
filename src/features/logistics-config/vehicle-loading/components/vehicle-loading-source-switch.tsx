import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  VEHICLE_LOADING_SOURCE_OPTIONS,
  type VehicleLoadingSourceType,
} from '../data/vehicle-loading-sources'
import { FieldCard } from './field-card'

type Props = {
  value: VehicleLoadingSourceType
  onChange: (value: VehicleLoadingSourceType) => void
}

export function VehicleLoadingSourceSwitch({ value, onChange }: Props) {
  return (
    <FieldCard title='输入来源' description='选择当前装载试算的来源'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <Badge className='border-none bg-primary/10 text-primary'>SOURCE</Badge>
      </div>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {VEHICLE_LOADING_SOURCE_OPTIONS.map((option) => {
          const active = option.id === value
          return (
            <Button
              key={option.id}
              type='button'
              variant='outline'
              onClick={() => onChange(option.id)}
              className={`h-auto min-h-24 flex-col items-start justify-start rounded-[22px] border-dashed px-4 py-4 text-left transition-all ${
                active
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border/60 bg-muted/20 text-foreground hover:bg-muted/40'
              }`}
            >
              <div className='text-sm font-black tracking-tight'>
                {option.label}
              </div>
              <div className='mt-2 text-[11px] leading-relaxed opacity-80'>
                {option.description}
              </div>
            </Button>
          )
        })}
      </div>
    </FieldCard>
  )
}

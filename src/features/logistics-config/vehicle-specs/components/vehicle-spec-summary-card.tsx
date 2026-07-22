import { Card } from '@/components/ui/card'
import type { VehicleSpec } from '../data/vehicle-specs.types'
import { VehiclePhotoTriggerButton } from './vehicle-photo-trigger-button'
import { VehicleSpecCardHeader } from './vehicle-spec-card-header'
import { VehicleSpecCardMetrics } from './vehicle-spec-card-metrics'
import { VehicleSpecCardNotes } from './vehicle-spec-card-notes'
import { VehicleSpecCardRules } from './vehicle-spec-card-rules'

type Props = {
  spec: VehicleSpec
  onOpenPhotos: (spec: VehicleSpec) => void
}

export function VehicleSpecSummaryCard({ spec, onOpenPhotos }: Props) {
  return (
    <Card className='overflow-hidden rounded-[28px] border border-dashed border-border/50 bg-card/95 p-0 shadow-[0_1px_0_rgba(15,23,42,0.03)]'>
      <div className='flex flex-col gap-0'>
        <div className='flex flex-col gap-3 border-b border-dashed border-border/60 px-4 py-3 xl:flex-row xl:items-start xl:justify-between'>
          <div className='min-w-0 flex-1'>
            <VehicleSpecCardHeader spec={spec} />
          </div>
          <VehiclePhotoTriggerButton
            onClick={() => onOpenPhotos(spec)}
            className='h-9 shrink-0 rounded-xl px-4 text-[10px] font-black tracking-[0.18em] uppercase'
          />
        </div>

        <div className='space-y-4 px-4 py-4'>
          <VehicleSpecCardMetrics spec={spec} />
          <VehicleSpecCardRules spec={spec} />
          <VehicleSpecCardNotes spec={spec} />
        </div>
      </div>
    </Card>
  )
}

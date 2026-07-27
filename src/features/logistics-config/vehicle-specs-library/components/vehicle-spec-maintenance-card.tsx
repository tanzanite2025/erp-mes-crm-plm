import { Card } from '@/components/ui/card'
import { VehiclePhotoTriggerButton } from '../../vehicle-specs/components/vehicle-photo-trigger-button'
import { VehiclePhotoUploadPanel } from '../../vehicle-specs/components/vehicle-photo-upload-panel'
import { VehicleSpecCardHeader } from '../../vehicle-specs/components/vehicle-spec-card-header'
import { VehicleSpecCardMetrics } from '../../vehicle-specs/components/vehicle-spec-card-metrics'
import { VehicleSpecCardNotes } from '../../vehicle-specs/components/vehicle-spec-card-notes'
import { VehicleSpecCardRules } from '../../vehicle-specs/components/vehicle-spec-card-rules'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'

type Props = {
  spec: VehicleSpec
  onOpenPhotos: (spec: VehicleSpec) => void
}

export function VehicleSpecMaintenanceCard({ spec, onOpenPhotos }: Props) {
  return (
    <Card className='overflow-hidden rounded-[28px] border border-border/80 bg-background p-0 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] dark:bg-card dark:shadow-[0_16px_36px_rgba(0,0,0,0.22)] dark:ring-white/[0.03]'>
      <div className='flex flex-col gap-0'>
        <div className='flex flex-col gap-3 border-b border-border/70 bg-muted/10 px-4 py-3 xl:flex-row xl:items-start xl:justify-between'>
          <div className='min-w-0 flex-1'>
            <VehicleSpecCardHeader spec={spec} />
          </div>
          <VehiclePhotoTriggerButton
            onClick={() => onOpenPhotos(spec)}
            className='h-9 shrink-0 rounded-xl px-4 text-[10px] font-black tracking-[0.18em] uppercase'
          />
        </div>

        <div className='grid gap-4 px-4 py-4 lg:grid-cols-[244px_1fr] xl:gap-4'>
          <VehiclePhotoUploadPanel vehicle={spec} />

          <div className='min-w-0 space-y-4'>
            <VehicleSpecCardMetrics spec={spec} />
            <VehicleSpecCardRules spec={spec} />
            <VehicleSpecCardNotes spec={spec} />
          </div>
        </div>
      </div>
    </Card>
  )
}

import type { VehicleSpec } from '../../vehicle-loading/data/vehicle-loading.types'
import { VehicleSpecCard } from './vehicle-spec-card'

type Props = {
  vehicleSpecs: VehicleSpec[]
  onOpenPhotos: (spec: VehicleSpec) => void
}

export function VehicleSpecsLibraryContent({ vehicleSpecs, onOpenPhotos }: Props) {
  return (
    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5'>
      {vehicleSpecs.map((spec) => (
        <VehicleSpecCard key={spec.id} spec={spec} onOpenPhotos={onOpenPhotos} />
      ))}
    </div>
  )
}

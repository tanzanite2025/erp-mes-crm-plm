import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import { VehicleSpecMaintenanceCard } from './vehicle-spec-maintenance-card'
import { VehicleSpecsLibraryEmptyState } from './vehicle-specs-library-state'

type Props = {
  vehicleSpecs: VehicleSpec[]
  search: string
  onOpenPhotos: (spec: VehicleSpec) => void
}

export function VehicleSpecsLibraryContent({
  vehicleSpecs,
  search,
  onOpenPhotos,
}: Props) {
  if (vehicleSpecs.length === 0) {
    return <VehicleSpecsLibraryEmptyState search={search} />
  }

  return (
    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5'>
      {vehicleSpecs.map((spec) => (
        <VehicleSpecMaintenanceCard
          key={spec.id}
          spec={spec}
          onOpenPhotos={onOpenPhotos}
        />
      ))}
    </div>
  )
}

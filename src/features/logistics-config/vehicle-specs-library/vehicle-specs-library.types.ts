import type { VehicleSpec } from '../vehicle-loading/data/vehicle-loading.types'

export type VehicleSpecsLibraryState = 'loading' | 'empty' | 'error' | 'ready'

export type VehicleSpecsLibraryProps = {
  vehicleSpecs: VehicleSpec[]
  isLoadingSpecs: boolean
  specsError: Error | null
  reload: () => Promise<void>
}

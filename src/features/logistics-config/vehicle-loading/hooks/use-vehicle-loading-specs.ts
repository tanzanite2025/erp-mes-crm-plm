import { useEffect } from 'react'
import { useVehicleSpecsQuery } from '../../vehicle-specs/hooks/use-vehicle-specs-query'

export function useVehicleLoadingSpecs(reloadToken: number) {
  const { vehicleSpecs, isLoadingSpecs, specsError, reload } =
    useVehicleSpecsQuery()

  useEffect(() => {
    if (reloadToken > 0) {
      void reload()
    }
  }, [reload, reloadToken])

  return {
    vehicleSpecs,
    isLoadingSpecs,
    specsError,
  }
}

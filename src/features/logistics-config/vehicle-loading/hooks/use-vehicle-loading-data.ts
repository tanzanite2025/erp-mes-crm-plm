import { useCallback, useState } from 'react'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
  VehicleSpec,
} from '../data/vehicle-loading.types'
import { useVehicleLoadingRecommendations } from './use-vehicle-loading-recommendations'
import { useVehicleLoadingSpecs } from './use-vehicle-loading-specs'

export function useVehicleLoadingData(
  summary: ShipmentSummary,
  packageInput: VehicleLoadingPackageInput | null,
  enabled: boolean
) {
  const [reloadToken, setReloadToken] = useState(0)
  const { vehicleSpecs, isLoadingSpecs, specsError } =
    useVehicleLoadingSpecs(reloadToken)
  const { recommendations, isLoadingRecommendations, recommendationsError } =
    useVehicleLoadingRecommendations(
      summary,
      vehicleSpecs,
      packageInput,
      enabled,
      reloadToken
    )

  const reload = useCallback(() => {
    setReloadToken((prev) => prev + 1)
  }, [])

  return {
    vehicleSpecs: vehicleSpecs as VehicleSpec[],
    recommendations,
    isLoadingSpecs,
    isLoadingRecommendations,
    specsError,
    recommendationsError,
    reload,
  }
}

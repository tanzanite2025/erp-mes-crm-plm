import { useCallback, useMemo, useState } from 'react'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import { useVehicleLoadingRecommendations } from './use-vehicle-loading-recommendations'
import { useVehicleLoadingSpecs } from './use-vehicle-loading-specs'

export function useVehicleLoadingData(
  summary: ShipmentSummary,
  packageInput: VehicleLoadingPackageInput | null,
  enabled: boolean,
  filterVehicleSpecsForRecommendation?: (spec: VehicleSpec) => boolean
) {
  const [reloadToken, setReloadToken] = useState(0)
  const { vehicleSpecs, isLoadingSpecs, specsError } =
    useVehicleLoadingSpecs(reloadToken)
  const recommendationVehicleSpecs = useMemo(
    () =>
      filterVehicleSpecsForRecommendation
        ? vehicleSpecs.filter(filterVehicleSpecsForRecommendation)
        : vehicleSpecs,
    [filterVehicleSpecsForRecommendation, vehicleSpecs]
  )
  const { recommendations, isLoadingRecommendations, recommendationsError } =
    useVehicleLoadingRecommendations(
      summary,
      recommendationVehicleSpecs,
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

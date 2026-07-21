import { useQuery } from '@tanstack/react-query'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
  VehicleSpec,
} from '../data/vehicle-loading.types'
import { getVehicleRecommendations } from '../services/vehicle-loading-service'

export function useVehicleLoadingRecommendations(
  summary: ShipmentSummary,
  vehicleSpecs: VehicleSpec[],
  packageInput: VehicleLoadingPackageInput | null,
  enabled: boolean,
  reloadToken: number
) {
  const query = useQuery({
    queryKey: [
      'vehicle-loading',
      'recommendations',
      summary,
      packageInput,
      vehicleSpecs,
      reloadToken,
    ],
    queryFn: () =>
      getVehicleRecommendations(
        summary,
        vehicleSpecs,
        packageInput ?? undefined
      ),
    enabled: vehicleSpecs.length > 0 && enabled && packageInput !== null,
    retry: false,
  })

  return {
    recommendations: query.data?.recommendations ?? [],
    isLoadingRecommendations:
      vehicleSpecs.length > 0 && enabled && packageInput !== null
        ? query.isLoading
        : false,
    recommendationsError:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error('Failed to load vehicle recommendations')
          : null,
  }
}

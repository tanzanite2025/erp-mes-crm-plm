import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ShipmentSummary, VehicleLoadingPackageInput, VehicleSpec } from '../data/vehicle-loading.types'
import { getVehicleLoadingSourceConfig, type VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import { getVehicleRecommendations } from '../services/vehicle-loading-service'

export function useVehicleLoadingRecommendations(
  summary: ShipmentSummary,
  vehicleSpecs: VehicleSpec[],
  source: VehicleLoadingSourceType,
  packageInput: VehicleLoadingPackageInput | null,
  enabled: boolean,
  reloadToken: number
) {
  const sourceConfig = useMemo(() => getVehicleLoadingSourceConfig(source), [source])

  const query = useQuery({
    queryKey: [
      'vehicle-loading',
      'recommendations',
      source,
      summary,
      sourceConfig.label,
      packageInput,
      vehicleSpecs,
      reloadToken,
    ],
    queryFn: () => getVehicleRecommendations(summary, vehicleSpecs, source, sourceConfig.label, packageInput ?? undefined),
    enabled: vehicleSpecs.length > 0 && enabled && packageInput !== null,
    retry: false,
  })

  return {
    recommendations: query.data?.recommendations ?? [],
    isLoadingRecommendations: vehicleSpecs.length > 0 && enabled && packageInput !== null ? query.isLoading : false,
    recommendationsError: query.error instanceof Error ? query.error : query.error ? new Error('Failed to load vehicle recommendations') : null,
  }
}

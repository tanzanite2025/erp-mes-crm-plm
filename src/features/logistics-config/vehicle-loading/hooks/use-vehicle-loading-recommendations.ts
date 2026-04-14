import { useEffect, useMemo, useState } from 'react'
import type { ShipmentSummary, VehicleSpec } from '../data/vehicle-loading.types'
import { getVehicleLoadingSourceConfig, type VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import { getVehicleRecommendations } from '../services/vehicle-loading-service'
import { createDefaultPackageProfileAdapter, type PackageProfileAdapter, type PackageProfileAdapterContext } from '../services/vehicle-loading-package-adapters'

export function useVehicleLoadingRecommendations(
  summary: ShipmentSummary,
  vehicleSpecs: VehicleSpec[],
  source: VehicleLoadingSourceType,
  reloadToken: number
) {
  const [recommendations, setRecommendations] = useState<Awaited<ReturnType<typeof getVehicleRecommendations>>['recommendations']>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true)
  const [recommendationsError, setRecommendationsError] = useState<Error | null>(null)
  const packageProfileAdapter = useMemo<PackageProfileAdapter>(() => createDefaultPackageProfileAdapter(), [])
  const sourceConfig = useMemo(() => getVehicleLoadingSourceConfig(source), [source])
  const packageProfileContext = useMemo<PackageProfileAdapterContext>(
    () => ({ sourceId: `${sourceConfig.id}-shipment`, sourceName: sourceConfig.label }),
    [sourceConfig]
  )

  useEffect(() => {
    let active = true

    void getVehicleRecommendations(summary, vehicleSpecs, packageProfileAdapter, packageProfileContext)
      .then((response) => {
        if (!active) return
        setRecommendations(response.recommendations)
        setRecommendationsError(null)
        setIsLoadingRecommendations(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setRecommendationsError(cause instanceof Error ? cause : new Error('Failed to load vehicle recommendations'))
        setRecommendations([])
        setIsLoadingRecommendations(false)
      })

    return () => {
      active = false
    }
  }, [packageProfileAdapter, packageProfileContext, reloadToken, summary, vehicleSpecs])

  return {
    recommendations,
    isLoadingRecommendations,
    recommendationsError,
  }
}

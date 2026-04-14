import { useQuery } from '@tanstack/react-query'
import { getVehicleSpecs } from '../services/vehicle-loading-service'
import { vehicleLoadingQueryKeys } from '../query-keys'

export function useVehicleSpecsQuery() {
  const query = useQuery({
    queryKey: vehicleLoadingQueryKeys.specs(),
    queryFn: getVehicleSpecs,
  })

  return {
    vehicleSpecs: query.data ?? [],
    isLoadingSpecs: query.isLoading,
    specsError: query.error instanceof Error ? query.error : query.error ? new Error('Failed to load vehicle specs') : null,
    reload: async () => {
      await query.refetch()
    },
  }
}

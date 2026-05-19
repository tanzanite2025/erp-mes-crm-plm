import { useQuery } from '@tanstack/react-query'
import { isForbiddenError } from '@/lib/error-status'
import { getVehicleSpecs } from '../services/vehicle-loading-service'
import { vehicleLoadingQueryKeys } from '../query-keys'

export type VehicleSpecsLoadState = 'loading' | 'ok' | 'forbidden' | 'failed' | 'empty'

export function useVehicleSpecsQuery() {
  const query = useQuery({
    queryKey: vehicleLoadingQueryKeys.specs(),
    queryFn: getVehicleSpecs,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const status: VehicleSpecsLoadState = query.isLoading
    ? 'loading'
    : isForbiddenError(query.error)
      ? 'forbidden'
      : query.error
        ? 'failed'
      : (query.data?.length ?? 0) === 0
        ? 'empty'
        : 'ok'

  return {
    vehicleSpecs: query.data ?? [],
    isLoadingSpecs: query.isLoading,
    specsError: query.error instanceof Error ? query.error : query.error ? new Error('Failed to load vehicle specs') : null,
    specsStatus: status,
    reload: async () => {
      await query.refetch()
    },
  }
}

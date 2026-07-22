import { useQuery } from '@tanstack/react-query'
import { isForbiddenError } from '@/lib/error-status'
import { vehicleSpecsQueryKeys } from '../query-keys'
import { getVehicleSpecs } from '../services/vehicle-specs-service'

export type VehicleSpecsLoadState =
  | 'loading'
  | 'ok'
  | 'forbidden'
  | 'failed'
  | 'empty'

type UseVehicleSpecsQueryOptions = {
  enabled?: boolean
}

export function useVehicleSpecsQuery({
  enabled = true,
}: UseVehicleSpecsQueryOptions = {}) {
  const query = useQuery({
    queryKey: vehicleSpecsQueryKeys.list(),
    queryFn: getVehicleSpecs,
    enabled,
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
    specsError:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error('Failed to load vehicle specs')
          : null,
    specsStatus: status,
    reload: async () => {
      await query.refetch()
    },
  }
}

import { useQuery } from '@tanstack/react-query'
import { shippingManagementQueryKeys } from '../query-keys'
import { getShippingVehicleMatchItems } from '../services/shipping-vehicle-match-service'

export function useShippingVehicleMatch() {
  const query = useQuery({
    queryKey: shippingManagementQueryKeys.vehicleMatchItems(),
    queryFn: getShippingVehicleMatchItems,
    retry: false,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : query.error ? new Error('Failed to load shipping vehicle match items') : null,
    refetch: query.refetch,
  }
}

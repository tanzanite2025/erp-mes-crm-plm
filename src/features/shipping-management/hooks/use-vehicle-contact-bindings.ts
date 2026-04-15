import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { type VehicleContactRemoteFilters } from '../contact-filters.shared'
import { vehicleContactQueryKeys } from '../query-keys'
import { vehicleContactService } from '../services/vehicle-contact-service'
const TOAST_DURATION_MS = 2500

export function useVehicleContactBindings(filters: VehicleContactRemoteFilters) {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')

  const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    setToastVariant(variant)
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), TOAST_DURATION_MS)
  }, [])

  const query = useQuery({
    queryKey: vehicleContactQueryKeys.list(filters),
    queryFn: () => vehicleContactService.listBindings(filters),
    retry: false,
  })

  return {
    bindings: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error : query.error ? new Error('联系人加载失败') : null,
    toastMessage,
    toastVariant,
    showToast,
    reload: async () => {
      await query.refetch()
    },
  }
}

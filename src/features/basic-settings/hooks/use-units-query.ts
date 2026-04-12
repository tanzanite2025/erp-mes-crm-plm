import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BASIC_SETTINGS_UNITS_QUERY_KEY } from '../query-keys'
import { unitService } from '../services/unit-service'

interface UseUnitsQueryOptions {
  enabled?: boolean
}

export function useUnitsQuery(options: UseUnitsQueryOptions = {}) {
  const { enabled = true } = options
  const queryClient = useQueryClient()

  const unitsQuery = useQuery({
    queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY,
    queryFn: () => unitService.getUnits(),
    enabled,
  })

  const invalidateUnits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY })
  }, [queryClient])

  return {
    units: unitsQuery.data ?? [],
    isLoading: unitsQuery.isLoading,
    error: unitsQuery.error,
    refetch: unitsQuery.refetch,
    invalidateUnits,
  }
}

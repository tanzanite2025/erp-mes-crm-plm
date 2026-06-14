import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { BASIC_SETTINGS_UNITS_QUERY_KEY } from '../query-keys'
import { unitService, type Unit } from '../services/unit-service'

interface UseUnitsQueryOptions {
  enabled?: boolean
  staleTime?: number
}

export function useUnitsQuery(options: UseUnitsQueryOptions = {}) {
  const { enabled = true, staleTime } = options
  const queryClient = useQueryClient()

  const unitsQuery = useQuery({
    queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY,
    queryFn: () => unitService.getUnits(),
    enabled,
    staleTime,
  })

  const invalidateUnits = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY,
    })
  }, [queryClient])

  const readResource: ReadResource<Unit[]> = (() => {
    if (!enabled) {
      return {
        status: 'ready',
        data: [],
      }
    }

    const failure = resolveQueryFailure({
      data: unitsQuery.data,
      error: unitsQuery.error,
      isPending: unitsQuery.isPending,
      scope: 'useUnitsQuery.units',
      missingMessage: '[CRITICAL] Units missing after load',
      failureMessage: '[CRITICAL] Units query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (unitsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: (unitsQuery.data as Unit[]) ?? [],
    }
  })()

  return {
    readResource,
    units: readResource.status === 'ready' ? readResource.data : [],
    isLoading: readResource.status === 'loading',
    error: readResource.status === 'error' ? readResource.error : null,
    refetch: unitsQuery.refetch,
    invalidateUnits,
  }
}

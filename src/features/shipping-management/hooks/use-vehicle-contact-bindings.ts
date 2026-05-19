import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type VehicleContactRemoteFilters } from '../contact-filters.shared'
import { vehicleContactQueryKeys } from '../query-keys'
import { vehicleContactService } from '../services/vehicle-contact-service'
import { type VehicleContactBinding } from '../vehicle-contact.types'

export function useVehicleContactBindings(filters: VehicleContactRemoteFilters) {
  const query = useQuery({
    queryKey: vehicleContactQueryKeys.list(filters),
    queryFn: () => vehicleContactService.listBindings(filters),
    retry: false,
  })

  const readResource = useMemo<ReadResource<VehicleContactBinding[]>>(() => {
    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useVehicleContactBindings.list',
      missingMessage: '[CRITICAL] Vehicle contact bindings missing after load',
      failureMessage: '[CRITICAL] Vehicle contact bindings query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (query.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: query.data as VehicleContactBinding[],
    }
  }, [query.data, query.error, query.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    reload: async () => {
      await query.refetch()
    },
  }
}


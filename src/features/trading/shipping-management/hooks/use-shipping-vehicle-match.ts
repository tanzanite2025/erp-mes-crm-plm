import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { shippingManagementQueryKeys } from '../query-keys'
import { getShippingVehicleMatchItems } from '../services/shipping-vehicle-match-service'
import type { ShippingVehicleMatchItem } from '../types'

const logger = createLogger('useShippingVehicleMatch')

export function useShippingVehicleMatch() {
  const query = useQuery({
    queryKey: shippingManagementQueryKeys.vehicleMatchItems(),
    queryFn: getShippingVehicleMatchItems,
    retry: false,
  })

  const readResource = useMemo<ReadResource<ShippingVehicleMatchItem[]>>(() => {
    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useShippingVehicleMatch.items',
      missingMessage:
        '[CRITICAL] Shipping vehicle match items missing after load',
      failureMessage: '[CRITICAL] Shipping vehicle match items query failed',
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
      data: query.data as ShippingVehicleMatchItem[],
    }
  }, [query.data, query.error, query.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load shipping vehicle match items: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    retryRead: query.refetch,
  }
}

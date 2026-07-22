'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import type { Furnace } from '../data/furnace-schema'
import { calculateFurnaceStats } from '../data/furnace-stats'
import { FurnaceService } from '../services/furnace-service'

const logger = createLogger('useFurnaces')

export const FURNACES_QUERY_KEY = ['furnaces'] as const

export function useFurnaces() {
  const queryClient = useQueryClient()
  const reloadFurnaces = () =>
    queryClient.invalidateQueries({ queryKey: FURNACES_QUERY_KEY })

  const furnacesQuery = useQuery({
    queryKey: FURNACES_QUERY_KEY,
    queryFn: () => FurnaceService.getFurnaces(),
  })

  const furnaces = useMemo(() => {
    if (furnacesQuery.isLoading) return []
    if (!furnacesQuery.data) {
      const error = new Error('[CRITICAL] Furnaces data is missing after load')
      failLoudly(error, 'useFurnaces.furnaces')
      throw error
    }
    return furnacesQuery.data
  }, [furnacesQuery.data, furnacesQuery.isLoading])

  const furnaceStats = useMemo(
    () => calculateFurnaceStats(furnaces),
    [furnaces]
  )

  const furnaceMutation = useMutation({
    mutationFn: async ({
      furnace,
      isPatch,
      delta,
    }: {
      furnace: Furnace
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && furnace.id) {
        return FurnaceService.patchFurnace(
          furnace.id,
          delta,
          furnace.version || 1
        )
      }
      return FurnaceService.saveFurnace(furnace)
    },
    onMutate: async ({ furnace }) => {
      await queryClient.cancelQueries({ queryKey: FURNACES_QUERY_KEY })
      const previousFurnaces =
        queryClient.getQueryData<Furnace[]>(FURNACES_QUERY_KEY) || []
      const exists = previousFurnaces.some((item) => item.id === furnace.id)
      const nextFurnaces = exists
        ? previousFurnaces.map((item) =>
            item.id === furnace.id ? furnace : item
          )
        : [...previousFurnaces, furnace]
      queryClient.setQueryData(FURNACES_QUERY_KEY, nextFurnaces)
      return { previousFurnaces }
    },
    onError: (error, _variables, context) => {
      if (context?.previousFurnaces) {
        queryClient.setQueryData(FURNACES_QUERY_KEY, context.previousFurnaces)
      }
      logger.error('Update furnace failed, rolled back', error)
    },
    onSuccess: async () => {
      await reloadFurnaces()
    },
  })

  return {
    furnaces,
    furnaceStats,
    isLoading: furnacesQuery.isLoading,
    updateFurnace: (furnace: Furnace, isPatch?: boolean, delta?: DeltaSet) =>
      furnaceMutation.mutateAsync({ furnace, isPatch, delta }),
    reloadFurnaces,
  }
}

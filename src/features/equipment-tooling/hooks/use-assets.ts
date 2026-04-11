'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type Mold, type Furnace } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { AssetService } from '../services/asset-service'
import { MoldTransactionService } from '../services/mold-transaction-service'
import { MoldMaintenanceService } from '../services/mold-maintenance-service'
import { FurnaceService } from '../services/furnace-service'

const logger = createLogger('useAssets')

export const MOLDS_QUERY_KEY = ['molds'] as const
export const FURNACES_QUERY_KEY = ['furnaces'] as const
export const MOLD_LOANS_QUERY_KEY = ['moldLoans'] as const

export function useAssets() {
  const queryClient = useQueryClient()
  const reloadMolds = () => queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY })
  const reloadFurnaces = () => queryClient.invalidateQueries({ queryKey: FURNACES_QUERY_KEY })
  const reloadLoans = () => queryClient.invalidateQueries({ queryKey: MOLD_LOANS_QUERY_KEY })
  const reloadAll = () =>
    Promise.all([
      reloadMolds(),
      reloadFurnaces(),
      reloadLoans(),
    ])

  const moldsQuery = useQuery({
    queryKey: MOLDS_QUERY_KEY,
    queryFn: () => AssetService.getMolds(),
  })

  const furnacesQuery = useQuery({
    queryKey: FURNACES_QUERY_KEY,
    queryFn: () => AssetService.getFurnaces(),
  })

  const loansQuery = useQuery({
    queryKey: MOLD_LOANS_QUERY_KEY,
    queryFn: () => AssetService.getLoans(),
  })

  const moldMutation = useMutation({
    mutationFn: async ({
      mold,
      isPatch,
      delta,
    }: {
      mold: Mold
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && mold.id) {
        return MoldMaintenanceService.patchMold(mold.id, delta, mold.version || 1)
      }

      return MoldTransactionService.createMold(mold)
    },
    onMutate: async ({ mold }) => {
      await queryClient.cancelQueries({ queryKey: MOLDS_QUERY_KEY })
      const previousMolds = queryClient.getQueryData<Mold[]>(MOLDS_QUERY_KEY) || []
      const exists = previousMolds.some((item) => item.id === mold.id)
      const nextMolds = exists
        ? previousMolds.map((item) => (item.id === mold.id ? mold : item))
        : [...previousMolds, mold]
      queryClient.setQueryData(MOLDS_QUERY_KEY, nextMolds)
      return { previousMolds }
    },
    onError: (error, _variables, context) => {
      if (context?.previousMolds) {
        queryClient.setQueryData(MOLDS_QUERY_KEY, context.previousMolds)
      }
      logger.error('Update mold failed, rolled back', error)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY })
    },
  })

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
        return FurnaceService.patchFurnace(furnace.id, delta, furnace.version || 1)
      }
      return FurnaceService.saveFurnace(furnace)
    },
    onMutate: async ({ furnace }) => {
      await queryClient.cancelQueries({ queryKey: FURNACES_QUERY_KEY })
      const previousFurnaces = queryClient.getQueryData<Furnace[]>(FURNACES_QUERY_KEY) || []
      const exists = previousFurnaces.some((item) => item.id === furnace.id)
      const nextFurnaces = exists
        ? previousFurnaces.map((item) => (item.id === furnace.id ? furnace : item))
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
      await queryClient.invalidateQueries({ queryKey: FURNACES_QUERY_KEY })
    },
  })

  return {
    molds: moldsQuery.data || [],
    furnaces: furnacesQuery.data || [],
    loans: loansQuery.data || [],
    isLoading: moldsQuery.isLoading || furnacesQuery.isLoading || loansQuery.isLoading,
    updateMolds: (mold: Mold, isPatch?: boolean, delta?: DeltaSet) =>
      moldMutation.mutateAsync({ mold, isPatch, delta }),
    updateFurnaces: (furnace: Furnace, isPatch?: boolean, delta?: DeltaSet) =>
      furnaceMutation.mutateAsync({ furnace, isPatch, delta }),
    reloadMolds,
    reloadFurnaces,
    reloadLoans,
    reloadAll,
  }
}

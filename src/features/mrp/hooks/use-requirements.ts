'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { useGetSalesOrders } from '@/features/trading/sales'
import { type SalesOrder } from '@/features/trading/data/schema'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'
import { mrpQueryKeys } from '../query-keys'
import { requirementService } from '../services/requirement-service'

const logger = createLogger('useRequirements')

export type { MaterialRequirement }

type RequirementsError = {
  message: string
}

const EMPTY_STATS: MrpStats = {
  totalMaterials: 0,
  missingBOMCount: 0,
  activeOrderCount: 0,
  analyzedModels: [],
}

const toRequirementsError = (error: unknown): RequirementsError => {
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: '[CRITICAL] Unknown MRP requirements error' }
}

export function useRequirements() {
  const queryClient = useQueryClient()
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
  const [stats, setStats] = useState<MrpStats>(EMPTY_STATS)
  const [calculateError, setCalculateError] = useState<RequirementsError | null>(null)

  const ordersQuery = useGetSalesOrders(1, 200, {
    withLines: true,
    status: ['Pending', 'InProgress'],
  })

  const calculateMutation = useMutation({
    mutationKey: mrpQueryKeys.requirementsCalculation(),
    mutationFn: async (selectedKeys?: string[]) => {
      if (selectedKeys) {
        logger.info(`Calculating requirements for ${selectedKeys.length} keys...`)
      }
      const result = await requirementService.getMrpRequirements(selectedKeys ?? [])
      if (!result.requirements) {
        throw new Error('[CRITICAL] MRP Calculation returned invalid null requirements')
      }
      return result
    },
    onSuccess: (result) => {
      setRequirements(result.requirements)
      setStats(result.stats)
      setCalculateError(null)
    },
    onError: (error) => {
      setRequirements([])
      setStats(EMPTY_STATS)
      setCalculateError(toRequirementsError(error))
      logger.error('Failed to calculate requirements from backend', error)
    },
  })

  const ordersError = useMemo(() => {
    if (!ordersQuery.error) return null
    return toRequirementsError(ordersQuery.error)
  }, [ordersQuery.error])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrdersRoot() })
  }

  return {
    requirements,
    activeOrders: ordersQuery.data?.items ?? ([] as SalesOrder[]),
    error: calculateError ?? ordersError,
    isLoading: ordersQuery.isLoading || ordersQuery.isFetching || calculateMutation.isPending,
    stats,
    refresh,
    calculate: async (selectedKeys?: string[]) => {
      await calculateMutation.mutateAsync(selectedKeys)
    },
  }
}

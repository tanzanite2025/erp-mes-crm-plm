'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import type {
  ProductionMaterialRequirementBomSelection,
  ProductionMaterialRequirementSourceLine,
} from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  type MaterialRequirement,
  type MrpStats,
} from '../data/requirement-schema'
import { mrpQueryKeys } from '../query-keys'
import { loadAllActiveSalesOrdersForProductionMaterialRequirementSelection } from '../services/production-material-requirement-order-selection-service'
import { requirementService } from '../services/requirement-service'

const logger = createLogger('useRequirements')
export type { MaterialRequirement }
type RequirementsError = Error
const EMPTY_STATS: MrpStats = {
  totalMaterials: 0,
  missingBOMCount: 0,
  activeOrderCount: 0,
  analyzedModels: [],
}

const normalizeProductionRequirementError = (
  error: unknown
): RequirementsError =>
  error instanceof Error
    ? error
    : new Error('[CRITICAL] Unknown MRP requirements error')

export function useRequirements() {
  const queryClient = useQueryClient()
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
  const [stats, setStats] = useState<MrpStats>(EMPTY_STATS)
  const [calculateError, setCalculateError] =
    useState<RequirementsError | null>(null)
  const [sourceLines, setSourceLines] = useState<
    ProductionMaterialRequirementSourceLine[]
  >([])
  const [bomSelections, setBomSelections] = useState<
    ProductionMaterialRequirementBomSelection[]
  >([])
  const [lastSelectedKeys, setLastSelectedKeys] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const ordersQuery = useQuery({
    queryKey: [
      ...tradingQueryKeys.salesOrdersRoot(),
      'production-material-requirement-selection',
    ],
    queryFn: loadAllActiveSalesOrdersForProductionMaterialRequirementSelection,
  })
  const calculateMutation = useMutation({
    mutationKey: mrpQueryKeys.requirementsCalculation(),
    mutationFn: ({
      selectedKeys,
      bomSelections,
    }: {
      selectedKeys: string[]
      bomSelections: ProductionMaterialRequirementBomSelection[]
    }) => requirementService.getMrpRequirements(selectedKeys, bomSelections),
    onMutate: () => {
      setIsComplete(false)
      setRequirements([])
      setStats(EMPTY_STATS)
      setCalculateError(null)
    },
    onSuccess: (result) => {
      setRequirements(result.requirements)
      setStats(result.stats)
      setSourceLines(result.sourceLines)
      setIsComplete(result.isComplete)
    },
    onError: (error) => {
      setRequirements([])
      setStats(EMPTY_STATS)
      setIsComplete(false)
      setCalculateError(normalizeProductionRequirementError(error))
      logger.error('Failed to calculate requirements from backend', error)
    },
  })
  const ordersError = useMemo(
    () =>
      ordersQuery.error
        ? normalizeProductionRequirementError(ordersQuery.error)
        : null,
    [ordersQuery.error]
  )

  return {
    requirements,
    stats,
    sourceLines,
    bomSelections,
    isComplete,
    activeOrders: ordersQuery.data ?? [],
    ordersError,
    isLoadingOrders: ordersQuery.isLoading || ordersQuery.isFetching,
    error: calculateError ?? ordersError,
    isLoading:
      ordersQuery.isLoading ||
      ordersQuery.isFetching ||
      calculateMutation.isPending,
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      }),
    setBomSelection: (selection: ProductionMaterialRequirementBomSelection) => {
      setBomSelections((current) => [
        ...current.filter(
          (item) =>
            item.salesOrderId !== selection.salesOrderId ||
            item.salesOrderLineId !== selection.salesOrderLineId
        ),
        selection,
      ])
      setIsComplete(false)
      setRequirements([])
    },
    recalculate: () =>
      calculateMutation.mutate({
        selectedKeys: lastSelectedKeys,
        bomSelections,
      }),
    calculate: (selectedKeys: string[] = []) => {
      setLastSelectedKeys(selectedKeys)
      setBomSelections([])
      setSourceLines([])
      calculateMutation.mutate({ selectedKeys, bomSelections: [] })
    },
  }
}

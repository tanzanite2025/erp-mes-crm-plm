import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import {
  createWarehouseUiFeedback,
  type WarehouseUiFeedback,
} from '../../hooks/warehouse-ui-feedback'
import { warehouseQueryKeys } from '../../query-keys'
import {
  type InventoryThresholdRule,
  type InventoryThresholdRuleWritePayload,
  type InventoryThresholdTargetOptionsResponse,
} from '../data/schema'
import { InventoryThresholdService } from '../services/inventory-threshold-service'
import { invalidateMaterialThresholdState } from '../services/material-threshold-helpers'

const logger = createLogger('useMaterialThresholds')

export type MaterialThresholdReadResource = CompositeReadResource<{
  rules: InventoryThresholdRule[]
  targetOptions: InventoryThresholdTargetOptionsResponse
}>

export function useMaterialThresholds(
  feedback?: Pick<WarehouseUiFeedback, 'success'>
) {
  const queryClient = useQueryClient()
  const ui = useMemo(() => feedback ?? createWarehouseUiFeedback(), [feedback])
  const { t } = useLanguage()

  const rulesQuery = useQuery({
    queryKey: warehouseQueryKeys.thresholdRules(),
    queryFn: () => InventoryThresholdService.listRules(),
  })

  const targetOptionsQuery = useQuery({
    queryKey: warehouseQueryKeys.thresholdTargetOptions(),
    queryFn: () => InventoryThresholdService.getTargetOptions(),
  })

  const createMutation = useMutation({
    mutationFn: (payload: InventoryThresholdRuleWritePayload) =>
      InventoryThresholdService.createRule(payload),
    onSuccess: async () => {
      await invalidateMaterialThresholdState(queryClient)
      ui.success(t('warehouseConfig.materialThresholds.toast.created'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: {
      id: string
      payload: InventoryThresholdRuleWritePayload
    }) => InventoryThresholdService.updateRule(params.id, params.payload),
    onSuccess: async () => {
      await invalidateMaterialThresholdState(queryClient)
      ui.success(t('warehouseConfig.materialThresholds.toast.updated'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => InventoryThresholdService.deleteRule(id),
    onSuccess: async () => {
      await invalidateMaterialThresholdState(queryClient)
      ui.success(t('warehouseConfig.materialThresholds.toast.deleted'))
    },
  })

  const readResource = useMemo<MaterialThresholdReadResource>(() => {
    const rulesFailure = resolveQueryFailure({
      data: rulesQuery.data,
      error: rulesQuery.error,
      isPending: rulesQuery.isPending,
      scope: 'useMaterialThresholds.rules',
      missingMessage: '[CRITICAL] Inventory threshold rules missing after load',
      failureMessage: '[CRITICAL] Inventory threshold rules query failed',
    })
    if (rulesFailure) {
      return {
        status: 'error',
        error: rulesFailure.error,
        scope: rulesFailure.scope,
      }
    }

    const targetOptionsFailure = resolveQueryFailure({
      data: targetOptionsQuery.data,
      error: targetOptionsQuery.error,
      isPending: targetOptionsQuery.isPending,
      scope: 'useMaterialThresholds.targetOptions',
      missingMessage:
        '[CRITICAL] Inventory threshold target options missing after load',
      failureMessage:
        '[CRITICAL] Inventory threshold target options query failed',
    })
    if (targetOptionsFailure) {
      return {
        status: 'error',
        error: targetOptionsFailure.error,
        scope: targetOptionsFailure.scope,
      }
    }

    if (rulesQuery.isPending || targetOptionsQuery.isPending) {
      return { status: 'loading' }
    }

    const rules = rulesQuery.data
    const targetOptions = targetOptionsQuery.data
    if (!rules) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Inventory threshold rules missing after load'
        ),
        scope: 'useMaterialThresholds.rules',
      }
    }
    if (!targetOptions) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Inventory threshold target options missing after load'
        ),
        scope: 'useMaterialThresholds.targetOptions',
      }
    }

    return {
      status: 'ready',
      rules,
      targetOptions,
    }
  }, [
    rulesQuery.data,
    rulesQuery.error,
    rulesQuery.isPending,
    targetOptionsQuery.data,
    targetOptionsQuery.error,
    targetOptionsQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load inventory thresholds: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    rules: readResource.status === 'ready' ? readResource.rules : [],
    targetOptions:
      readResource.status === 'ready'
        ? readResource.targetOptions
        : { materials: [], boms: [] },
    error: readResource.status === 'error' ? readResource.error : null,
    refetch: async () => {
      await Promise.all([rulesQuery.refetch(), targetOptionsQuery.refetch()])
    },
    createRule: createMutation.mutateAsync,
    updateRule: updateMutation.mutateAsync,
    deleteRule: deleteMutation.mutateAsync,
    isActionLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  }
}

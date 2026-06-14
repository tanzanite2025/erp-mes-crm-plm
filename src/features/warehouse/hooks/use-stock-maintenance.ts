import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  type ReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { warehouseQueryKeys } from '../query-keys'
import {
  StocktakeCoreService,
  StocktakeMaintenanceService,
  StocktakeOfflineAdapter,
  type PDAScanPayload,
  type StocktakeItem,
  type StocktakeTask,
} from '../stocktake'
import {
  createWarehouseUiFeedback,
  type WarehouseUiFeedback,
} from './warehouse-ui-feedback'

const logger = createLogger('useStocktake')

type StocktakeReadResource = CompositeReadResource<{
  tasks: StocktakeTask[]
  pendingScanCount: number
}>

type StocktakeItemsResource = { status: 'idle' } | ReadResource<StocktakeItem[]>

export function useStocktake(
  feedback?: Pick<WarehouseUiFeedback, 'error' | 'success'>
) {
  const ui = useMemo(() => feedback ?? createWarehouseUiFeedback(), [feedback])
  const queryClient = useQueryClient()

  const tasksQuery = useQuery({
    queryKey: warehouseQueryKeys.stocktakeTasks(),
    queryFn: () => StocktakeCoreService.getTasks(),
  })

  const pendingScansQuery = useQuery({
    queryKey: ['stocktake_pending_scans'],
    queryFn: async () => {
      const pending = await StocktakeOfflineAdapter.listPendingScans()
      return pending.filter(
        (item) => item.state === 'queued' || item.state === 'syncing'
      ).length
    },
  })

  const refreshPendingScans = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['stocktake_pending_scans'],
    })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      warehouseCategoryCode: string
      remarks?: string
    }) => StocktakeMaintenanceService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.stocktakeTasks(),
      })
      ui.success('盘点任务已创建')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'unknown error'
      ui.error(`发起盘点失败: ${message}`)
    },
  })

  const pdaSyncMutation = useMutation({
    mutationFn: (data: PDAScanPayload) =>
      StocktakeOfflineAdapter.submitScan(data),
    onSuccess: async (result) => {
      await refreshPendingScans()

      if (result.status === 'queued') {
        ui.success('扫描数据已保存为离线草稿，网络恢复后会自动补交。')
        return
      }

      ui.success('扫描数据已同步。')
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.stocktakeTasks(),
      })
    },
  })

  const flushPendingMutation = useMutation({
    mutationFn: () => StocktakeOfflineAdapter.flushQueuedScans(),
    onSuccess: async (result) => {
      await refreshPendingScans()
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.stocktakeTasks(),
      })

      if (result.syncedCount > 0) {
        ui.success(`已同步 ${result.syncedCount} 条离线扫描记录。`)
        return
      }

      if (result.remainingCount > 0) {
        ui.success(`当前仍有 ${result.remainingCount} 条待同步扫描记录。`)
      }
    },
  })

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: warehouseQueryKeys.stocktakeTasks(),
    })
    await refreshPendingScans()
  }, [queryClient, refreshPendingScans])

  useEffect(() => {
    return StocktakeOfflineAdapter.registerAutoFlush(() => {
      void refreshPendingScans()
      void queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.stocktakeTasks(),
      })
    })
  }, [queryClient, refreshPendingScans])

  const readResource = useMemo<StocktakeReadResource>(() => {
    const tasksFailure = resolveQueryFailure({
      data: tasksQuery.data,
      error: tasksQuery.error,
      isPending: tasksQuery.isPending,
      scope: 'useStocktake.tasks',
      missingMessage: '[CRITICAL] Stocktake tasks missing after load',
      failureMessage: '[CRITICAL] Stocktake tasks query failed',
    })
    if (tasksFailure) {
      return {
        status: 'error',
        error: tasksFailure.error,
        scope: tasksFailure.scope,
      }
    }

    if (pendingScansQuery.error) {
      return {
        status: 'error',
        error:
          pendingScansQuery.error instanceof Error
            ? pendingScansQuery.error
            : new Error('[CRITICAL] Stocktake pending scans query failed'),
        scope: 'useStocktake.pendingScanCount',
      }
    }

    if (tasksQuery.isPending || pendingScansQuery.isPending) {
      return { status: 'loading' }
    }

    if (pendingScansQuery.data === undefined) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Stocktake pending scan count missing after load'
        ),
        scope: 'useStocktake.pendingScanCount',
      }
    }

    return {
      status: 'ready',
      tasks: tasksQuery.data as StocktakeTask[],
      pendingScanCount: pendingScansQuery.data,
    }
  }, [
    pendingScansQuery.data,
    pendingScansQuery.error,
    pendingScansQuery.isPending,
    tasksQuery.data,
    tasksQuery.error,
    tasksQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load stocktake resources: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const tasks = useMemo(
    () => (readResource.status === 'ready' ? readResource.tasks : []),
    [readResource]
  )
  const pendingScanCount =
    readResource.status === 'ready' ? readResource.pendingScanCount : 0

  return {
    readResource,
    tasks: tasks ?? [],
    isLoading: readResource.status === 'loading',
    isError: readResource.status === 'error',
    refreshData,
    createStocktake: createMutation.mutateAsync,
    submitPdaScan: pdaSyncMutation.mutateAsync,
    flushPendingScans: flushPendingMutation.mutateAsync,
    pendingScanCount,
    isCreating: createMutation.isPending,
    isFlushingPendingScans: flushPendingMutation.isPending,
    retryRead: async () => {
      await Promise.all([tasksQuery.refetch(), pendingScansQuery.refetch()])
    },
  }
}

export function useStocktakeItems(taskId: string | null) {
  const itemsQuery = useQuery({
    queryKey: warehouseQueryKeys.stocktakeItems(taskId ?? ''),
    queryFn: () =>
      taskId ? StocktakeCoreService.getItems(taskId) : Promise.resolve([]),
    enabled: Boolean(taskId),
  })

  const itemsResource = useMemo<StocktakeItemsResource>(() => {
    if (!taskId) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: itemsQuery.data,
      error: itemsQuery.error,
      isPending: itemsQuery.isPending,
      scope: 'useStocktakeItems.items',
      missingMessage: '[CRITICAL] Stocktake items missing after load',
      failureMessage: '[CRITICAL] Stocktake items query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (itemsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: itemsQuery.data as StocktakeItem[],
    }
  }, [itemsQuery.data, itemsQuery.error, itemsQuery.isPending, taskId])

  useEffect(() => {
    if (itemsResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load stocktake items: ${itemsResource.scope}`,
      itemsResource.error
    )
    failLoudly(itemsResource.error, itemsResource.scope)
  }, [itemsResource])

  return {
    itemsResource,
    data: itemsResource.status === 'ready' ? itemsResource.data : [],
    isLoading: itemsResource.status === 'loading',
    error: itemsResource.status === 'error' ? itemsResource.error : null,
    refetch: itemsQuery.refetch,
  }
}

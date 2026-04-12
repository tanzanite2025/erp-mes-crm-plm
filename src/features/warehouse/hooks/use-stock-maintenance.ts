import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { warehouseQueryKeys } from '../query-keys'
import { StocktakeCoreService, StocktakeMaintenanceService, StocktakeOfflineAdapter, type PDAScanPayload } from '../stocktake'

export function useStocktake() {
    const queryClient = useQueryClient()

    const tasksQuery = useQuery({
        queryKey: warehouseQueryKeys.stocktakeTasks(),
        queryFn: () => StocktakeCoreService.getTasks(),
    })

    const pendingScansQuery = useQuery({
        queryKey: ['stocktake_pending_scans'],
        queryFn: async () => {
            const pending = await StocktakeOfflineAdapter.listPendingScans()
            return pending.filter((item) => item.state === 'queued' || item.state === 'syncing').length
        },
    })

    const refreshPendingScans = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['stocktake_pending_scans'] })
    }, [queryClient])

    const createMutation = useMutation({
        mutationFn: (data: { title: string, warehouseCategoryCode: string, remarks?: string }) =>
            StocktakeMaintenanceService.create(data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() })
            toast.success('盘点任务已创建')
        },
        onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : 'unknown error'
            toast.error(`发起盘点失败: ${message}`)
        },
    })

    const pdaSyncMutation = useMutation({
        mutationFn: (data: PDAScanPayload) => StocktakeOfflineAdapter.submitScan(data),
        onSuccess: async (result) => {
            await refreshPendingScans()

            if (result.status === 'queued') {
                toast.success('扫描数据已保存为离线草稿，网络恢复后会自动补交。')
                return
            }

            toast.success('扫描数据已同步。')
            await queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() })
        },
    })

    const flushPendingMutation = useMutation({
        mutationFn: () => StocktakeOfflineAdapter.flushQueuedScans(),
        onSuccess: async (result) => {
            await refreshPendingScans()
            await queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() })

            if (result.syncedCount > 0) {
                toast.success(`已同步 ${result.syncedCount} 条离线扫描记录。`)
                return
            }

            if (result.remainingCount > 0) {
                toast.success(`当前仍有 ${result.remainingCount} 条待同步扫描记录。`)
            }
        },
    })

    const refreshData = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() })
        await refreshPendingScans()
    }, [queryClient, refreshPendingScans])

    useEffect(() => {
        return StocktakeOfflineAdapter.registerAutoFlush(() => {
            void refreshPendingScans()
            void queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.stocktakeTasks() })
        })
    }, [queryClient, refreshPendingScans])

    const tasks = tasksQuery.data
    if (!tasksQuery.isLoading && tasksQuery.isSuccess && !tasks) {
        throw new Error('[CRITICAL] Stocktake Tasks missing in Hook: UseStocktake.tasks')
    }

    return {
        tasks: tasks ?? [],
        isLoading: tasksQuery.isLoading,
        isError: tasksQuery.isError,
        refreshData,
        createStocktake: createMutation.mutateAsync,
        submitPdaScan: pdaSyncMutation.mutateAsync,
        flushPendingScans: flushPendingMutation.mutateAsync,
        pendingScanCount: pendingScansQuery.data ?? 0,
        isCreating: createMutation.isPending,
        isFlushingPendingScans: flushPendingMutation.isPending,
    }
}

export function useStocktakeItems(taskId: string | null) {
    return useQuery({
        queryKey: warehouseQueryKeys.stocktakeItems(taskId ?? ''),
        queryFn: () => (taskId ? StocktakeCoreService.getItems(taskId) : Promise.resolve([])),
        enabled: Boolean(taskId),
    })
}

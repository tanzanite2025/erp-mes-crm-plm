import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { StocktakeCoreService, StocktakeOfflineAdapter, type StocktakeItem } from '@/features/warehouse/stocktake'

export function useGetStocktakeTasks() {
  return useQuery({
    queryKey: ['pda_stocktake_tasks'],
    queryFn: () => StocktakeCoreService.getTasks(),
  })
}

export function useGetStocktakeItems(taskId: string) {
  return useQuery({
    queryKey: ['pda_stocktake_items', taskId],
    queryFn: () => StocktakeCoreService.getItems(taskId),
    enabled: !!taskId,
  })
}

export function useStocktakeMutations() {
  const queryClient = useQueryClient()

  const refreshConflictQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pda_stocktake_conflicts'] })
    await queryClient.invalidateQueries({ queryKey: ['pda_stocktake_resolved_conflicts'] })
  }

  const patchItemMutation = useMutation({
    mutationFn: ({ id, delta, version, taskId }: { id: string; delta: DeltaSet; version: number; taskId: string }) =>
      StocktakeOfflineAdapter.submitPatchItem({ itemId: id, taskId, delta, version }),
    onMutate: async ({ id, delta, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['pda_stocktake_items', taskId] })
      const previousItems = queryClient.getQueryData<StocktakeItem[]>(['pda_stocktake_items', taskId])

      if (previousItems) {
        queryClient.setQueryData<StocktakeItem[]>(
          ['pda_stocktake_items', taskId],
          previousItems.map((item) => {
            if (item.id !== id) return item

            const newItem = { ...item, version: item.version + 1 }
            Object.keys(delta).forEach((key) => {
              const change = delta[key]
              if (change && typeof change === 'object' && 'n' in change) {
                ;(newItem as Record<string, unknown>)[key] = change.n
              }
            })

            if (typeof newItem.actualQty === 'number' && typeof newItem.theoryQty === 'number') {
              newItem.difference = newItem.actualQty - newItem.theoryQty
            }

            return newItem
          })
        )
      }

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['pda_stocktake_items', variables.taskId], context.previousItems)
      }

      toast.error('同步失败: ' + err.message)
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', variables.taskId] })

      if (result.status === 'queued') {
        toast.success('盘点项变更已离线保存，网络恢复后会自动补交')
        return
      }

      if (result.status === 'conflict') {
        toast.error('该盘点项存在版本冲突，请刷新后处理')
        return
      }

      toast.success('SDRTS 差量同步成功')
    },
  })

  const flushPatchMutation = useMutation({
    mutationFn: () => StocktakeOfflineAdapter.flushQueuedPatches(),
    onSuccess: async () => {
      await refreshConflictQueries()
    },
  })

  const resolveConflictMutation = useMutation({
    mutationFn: (conflictId: string) => StocktakeOfflineAdapter.resolveConflict(conflictId),
    onSuccess: async () => {
      await refreshConflictQueries()
    },
  })

  const retryConflictMutation = useMutation({
    mutationFn: async ({ conflictId, taskId }: { conflictId: string; taskId: string }) => {
      const result = await StocktakeOfflineAdapter.retryConflictAfterRefresh(conflictId)
      await queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', taskId] })
      await refreshConflictQueries()
      return result
    },
  })

  const batchResolveConflictMutation = useMutation({
    mutationFn: async (conflictIds: string[]) => {
      await Promise.all(conflictIds.map((conflictId) => StocktakeOfflineAdapter.resolveConflict(conflictId)))
    },
    onSuccess: async () => {
      await refreshConflictQueries()
    },
  })

  const batchRetryConflictMutation = useMutation({
    mutationFn: async ({ conflictIds, taskId }: { conflictIds: string[]; taskId: string }) => {
      await Promise.all(conflictIds.map((conflictId) => StocktakeOfflineAdapter.retryConflictAfterRefresh(conflictId)))
      await queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', taskId] })
    },
    onSuccess: async () => {
      await refreshConflictQueries()
    },
  })

  const conflictsQuery = useQuery({
    queryKey: ['pda_stocktake_conflicts'],
    queryFn: () => StocktakeOfflineAdapter.listConflicts(),
  })

  const resolvedConflictsQuery = useQuery({
    queryKey: ['pda_stocktake_resolved_conflicts'],
    queryFn: () => StocktakeOfflineAdapter.listResolvedConflicts(),
  })

  return {
    patchItemMutation,
    flushPatchMutation,
    resolveConflictMutation,
    retryConflictMutation,
    batchResolveConflictMutation,
    batchRetryConflictMutation,
    conflicts: conflictsQuery.data ?? [],
    resolvedConflicts: resolvedConflictsQuery.data ?? [],
    isLoadingConflicts: conflictsQuery.isLoading,
    isLoadingResolvedConflicts: resolvedConflictsQuery.isLoading,
  }
}

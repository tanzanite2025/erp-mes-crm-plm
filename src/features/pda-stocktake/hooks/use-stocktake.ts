import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StocktakeCoreService, type StocktakeItem } from '@/features/warehouse/services/stocktake-core-service'
import { StocktakeMaintenanceService } from '@/features/warehouse/services/stocktake-maintenance-service'
import { toast } from 'sonner'

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

  const patchItemMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: any; version: number; taskId: string }) =>
      StocktakeMaintenanceService.pdaPatchItem(id, delta, version),
    onMutate: async ({ id, delta, taskId }) => {
      // 乐观更新 (Optimistic UI) - SDRTS 核心体验
      await queryClient.cancelQueries({ queryKey: ['pda_stocktake_items', taskId] })
      const previousItems = queryClient.getQueryData<StocktakeItem[]>(['pda_stocktake_items', taskId])

      if (previousItems) {
        queryClient.setQueryData<StocktakeItem[]>(
          ['pda_stocktake_items', taskId],
          previousItems.map((item) => {
            if (item.id === id) {
              // 应用 Delta 变更，并乐观增加版次（SDRTS 并发防护）
              const newItem = { ...item, version: item.version + 1 }
              Object.keys(delta).forEach((key) => {
                const change = delta[key]
                if (change && typeof change === 'object' && 'n' in change) {
                  (newItem as any)[key] = change.n
                }
              })
              return newItem
            }
            return item
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', variables.taskId] })
      toast.success('SDRTS 差量同步成功')
    },
  })

  return { patchItemMutation }
}

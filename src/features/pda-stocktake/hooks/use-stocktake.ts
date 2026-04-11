import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { StocktakeCoreService, type StocktakeItem } from '@/features/warehouse/services/stocktake-core-service'
import { StocktakeMaintenanceService } from '@/features/warehouse/services/stocktake-maintenance-service'

type ApiMutationError = Error & {
  status?: number
  isConflict?: boolean
}

function isVersionConflictError(error: unknown): error is ApiMutationError {
  if (!error || typeof error !== 'object') return false
  const candidate = error as ApiMutationError
  return candidate.isConflict === true || candidate.status === 409
}

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

      if (isVersionConflictError(err)) {
        queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', variables.taskId] })
        toast.error('该盘点项已被其他人更新，请刷新后重试', {
          description: '系统已开始重新拉取最新盘点明细。',
          action: {
            label: '立即刷新',
            onClick: () => {
              queryClient.invalidateQueries({ queryKey: ['pda_stocktake_items', variables.taskId] })
            },
          },
        })
        return
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

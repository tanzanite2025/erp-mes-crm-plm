import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { warehouseQueryKeys } from '../query-keys'
import { StocktakeMaintenanceService } from '../stocktake'

export function useStocktakeAdjustmentSubmission() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const postAdjustmentMutation = useMutation({
    mutationFn: (taskId: string) =>
      StocktakeMaintenanceService.submitAdjustmentForApproval(taskId),
    onSuccess: async (_, taskId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.stocktakeTasks(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.stocktakeItems(taskId),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryAdjustments(),
        }),
      ])
      toast.success(t('warehouse.stocktake.toast.postSuccess'))
    },
    onError: (err: Error) => {
      toast.error(
        t('warehouse.stocktake.toast.postFailed', { message: err.message })
      )
    },
  })

  return {
    submitAdjustmentForApproval: postAdjustmentMutation.mutateAsync,
    isSubmittingAdjustment: postAdjustmentMutation.isPending,
  }
}

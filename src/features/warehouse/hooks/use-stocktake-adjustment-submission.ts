import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { warehouseQueryKeys } from '../query-keys'
import { StocktakeMaintenanceService } from '../stocktake'
import { createWarehouseUiFeedback, type WarehouseUiFeedback } from './warehouse-ui-feedback'

export function useStocktakeAdjustmentSubmission(feedback?: Pick<WarehouseUiFeedback, 'error' | 'success'>) {
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const ui = useMemo(
    () => feedback ?? createWarehouseUiFeedback(),
    [feedback],
  )

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
      ui.success(t('warehouse.stocktake.toast.postSuccess'))
    },
    onError: (err: Error) => {
      ui.error(
        t('warehouse.stocktake.toast.postFailed', { message: err.message })
      )
    },
  })

  return {
    submitAdjustmentForApproval: postAdjustmentMutation.mutateAsync,
    isSubmittingAdjustment: postAdjustmentMutation.isPending,
  }
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { AdjustmentService, type InventoryAdjustment } from '../adjustment'
import { warehouseQueryKeys } from '../query-keys'
import { createWarehouseUiFeedback, type WarehouseUiFeedback } from './warehouse-ui-feedback'

export function useAdjustmentHistory(feedback?: Pick<WarehouseUiFeedback, 'error' | 'success'>) {
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const ui = useMemo(
    () => feedback ?? createWarehouseUiFeedback(),
    [feedback],
  )
  const [selectedAdj, setSelectedAdj] = useState<InventoryAdjustment | null>(null)
  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false)
  const [adjToExecute, setAdjToExecute] = useState<InventoryAdjustment | null>(null)

  const adjustmentsQuery = useQuery({
    queryKey: warehouseQueryKeys.inventoryAdjustments(),
    queryFn: () => AdjustmentService.getHistory(),
  })

  const executeMutation = useMutation({
    mutationFn: (id: string) => AdjustmentService.execute(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inventoryAdjustments(),
      })
      ui.success(t('warehouse.adjustment.toast.executeSuccess'))
      setExecuteConfirmOpen(false)
      setAdjToExecute(null)
    },
    onError: (err: Error) => {
      ui.error(
        t('warehouse.adjustment.toast.executeFailed', { message: err.message })
      )
    },
  })

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: warehouseQueryKeys.inventoryAdjustments(),
    })
  }

  const handleExecuteClick = (adj: InventoryAdjustment) => {
    setAdjToExecute(adj)
    setExecuteConfirmOpen(true)
  }

  const onConfirmExecute = async () => {
    if (!adjToExecute) {
      const error = new Error('[CRITICAL] Missing adjustment execute target in useAdjustmentHistory.onConfirmExecute')
      failLoudly(error, 'useAdjustmentHistory.onConfirmExecute', { silentUI: true })
      ui.error(t('warehouse.adjustment.toast.executeMissingTarget'))
      setExecuteConfirmOpen(false)
      setAdjToExecute(null)
      return
    }
    await executeMutation.mutateAsync(adjToExecute.id)
  }

  return {
    adjustments: adjustmentsQuery.data ?? [],
    isLoading: adjustmentsQuery.isLoading,
    error: adjustmentsQuery.error,
    selectedAdj,
    setSelectedAdj,
    executeConfirmOpen,
    setExecuteConfirmOpen,
    executeConfirmDesc: `${adjToExecute?.adjustmentNo || ''} - ${t('warehouse.stock.toast.reconcileConfirm')}`,
    handleExecuteClick,
    onConfirmExecute,
    handleRefresh,
    isExecuting: executeMutation.isPending,
  }
}

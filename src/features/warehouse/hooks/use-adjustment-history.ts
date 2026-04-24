import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { AdjustmentService, type InventoryAdjustment } from '../adjustment'
import { warehouseQueryKeys } from '../query-keys'

export function useAdjustmentHistory() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()
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
      toast.success(t('warehouse.adjustment.toast.executeSuccess'))
      setExecuteConfirmOpen(false)
      setAdjToExecute(null)
    },
    onError: (err: Error) => {
      toast.error(
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
    if (!adjToExecute) return
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

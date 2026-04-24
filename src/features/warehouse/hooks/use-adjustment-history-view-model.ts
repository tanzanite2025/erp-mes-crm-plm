import { type InventoryAdjustment } from '../adjustment'
import { useAdjustmentHistory } from './use-adjustment-history'

export function useAdjustmentHistoryViewModel() {
  const adjustmentHistory = useAdjustmentHistory()

  const handleRefreshClick = () => {
    void adjustmentHistory.handleRefresh()
  }

  const handleOpenPreview = (adjustment: InventoryAdjustment) => {
    adjustmentHistory.setSelectedAdj(adjustment)
  }

  const handleClosePreview = () => {
    adjustmentHistory.setSelectedAdj(null)
  }

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open) handleClosePreview()
  }

  return {
    adjustments: adjustmentHistory.adjustments,
    isLoading: adjustmentHistory.isLoading,
    error: adjustmentHistory.error,
    selectedAdj: adjustmentHistory.selectedAdj,
    previewOpen: Boolean(adjustmentHistory.selectedAdj),
    executeConfirmOpen: adjustmentHistory.executeConfirmOpen,
    executeConfirmDesc: adjustmentHistory.executeConfirmDesc,
    isExecuting: adjustmentHistory.isExecuting,
    handleExecuteClick: adjustmentHistory.handleExecuteClick,
    handleExecuteConfirmOpenChange: adjustmentHistory.setExecuteConfirmOpen,
    handleConfirmExecute: adjustmentHistory.onConfirmExecute,
    handleRefreshClick,
    handleOpenPreview,
    handleClosePreview,
    handlePreviewOpenChange,
  }
}

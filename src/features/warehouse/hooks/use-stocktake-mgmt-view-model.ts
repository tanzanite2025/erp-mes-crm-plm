import { useMemo, useState, type FormEvent } from 'react'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { failLoudly } from '@/lib/safe-catch'
import { useStocktake, useStocktakeItems } from './use-stock-maintenance'
import { useStocktakeAdjustmentSubmission } from './use-stocktake-adjustment-submission'
import { useWarehouseCategoryOptions } from './use-warehouse-category'
import { type StocktakeTask } from '../stocktake'
import { filterWarehouseCategoriesByScene } from '../utils/warehouse-category-config'

export function useStocktakeMgmtViewModel() {
  const { allowsAction } = useNonBlockingPermissionActions()

  const {
    tasks,
    isLoading,
    isError,
    refreshData,
    createStocktake,
    isCreating,
  } = useStocktake()
  const { submitAdjustmentForApproval, isSubmittingAdjustment } =
    useStocktakeAdjustmentSubmission()

  const categoriesQuery = useWarehouseCategoryOptions()
  const stocktakeCategories = useMemo(() => {
    if (categoriesQuery.isLoading) return []
    if (!categoriesQuery.data) {
      const lookupError =
        categoriesQuery.error instanceof Error
          ? categoriesQuery.error
          : new Error('[CRITICAL] Stocktake warehouse categories missing after load')
      failLoudly(lookupError, 'useStocktakeMgmtViewModel.categories')
      throw lookupError
    }

    const filteredCategories = filterWarehouseCategoriesByScene(
      categoriesQuery.data,
      'stocktake'
    )
    if (filteredCategories.length === 0) {
      const lookupError = new Error(
        '[CRITICAL] No warehouse categories allowed for stocktake scene'
      )
      failLoudly(lookupError, 'useStocktakeMgmtViewModel.categories')
      throw lookupError
    }

    return filteredCategories
  }, [categoriesQuery.data, categoriesQuery.error, categoriesQuery.isLoading])

  const [selectedTask, setSelectedTask] = useState<StocktakeTask | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [adjustmentConfirmOpen, setAdjustmentConfirmOpen] = useState(false)

  const selectedTaskId = selectedTask?.id ?? null
  const { data: items, isLoading: itemsLoading } = useStocktakeItems(selectedTaskId)

  const canSubmitAdjustment =
    selectedTask?.status === 'IN_PROGRESS' || selectedTask?.status === 'COMPLETED'

  const handleCreateDialogOpenChange = (open: boolean) => {
    setIsCreateOpen(open)
  }

  const handleSelectTask = (task: StocktakeTask) => {
    setSelectedTask(task)
  }

  const handleRefresh = () => {
    void refreshData()
  }

  const handleCreateTaskSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!allowsAction('action_warehouse_stocktake_manage')) return

    const formData = new FormData(e.currentTarget)
    try {
      await createStocktake({
        title: formData.get('title') as string,
        warehouseCategoryCode: formData.get('category') as string,
        remarks: formData.get('remarks') as string,
      })
      setIsCreateOpen(false)
    } catch {
      // Already handled in hook toast
    }
  }

  const handleRequestAdjustmentSubmission = () => {
    if (!selectedTask) return
    if (!allowsAction('action_warehouse_adjustment_submit')) return
    setAdjustmentConfirmOpen(true)
  }

  const handleAdjustmentConfirmOpenChange = (open: boolean) => {
    setAdjustmentConfirmOpen(open)
  }

  const handleConfirmAdjustmentSubmission = async () => {
    if (!selectedTask) return
    try {
      await submitAdjustmentForApproval(selectedTask.id)
      setAdjustmentConfirmOpen(false)
    } catch (error) {
      failLoudly(error, 'useStocktakeMgmtViewModel.handleConfirmAdjustmentSubmission', {
        silentUI: true,
      })
    }
  }

  return {
    tasks,
    isLoading,
    error: isError,
    selectedTask,
    items,
    itemsLoading,
    stocktakeCategories,
    isCreateOpen,
    adjustmentConfirmOpen,
    isCreating,
    isSubmittingAdjustment,
    canSubmitAdjustment,
    handleRefresh,
    handleSelectTask,
    handleCreateDialogOpenChange,
    handleCreateTaskSubmit,
    handleRequestAdjustmentSubmission,
    handleAdjustmentConfirmOpenChange,
    handleConfirmAdjustmentSubmission,
  }
}

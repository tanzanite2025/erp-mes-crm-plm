import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type WarehouseCategoryOption } from '../category'
import { type StocktakeTask } from '../stocktake'
import { filterWarehouseCategoriesByScene } from '../utils/warehouse-category-config'
import { useStocktake, useStocktakeItems } from './use-stock-maintenance'
import { useStocktakeAdjustmentSubmission } from './use-stocktake-adjustment-submission'
import { useWarehouseCategoryOptions } from './use-warehouse-category'

const logger = createLogger('useStocktakeMgmtViewModel')

type StocktakeMgmtShellResource = CompositeReadResource<{
  tasks: StocktakeTask[]
  stocktakeCategories: WarehouseCategoryOption[]
}>

export function useStocktakeMgmtViewModel() {
  const { allowsAction } = usePermissionActions()

  const {
    readResource,
    tasks,
    isLoading,
    refreshData,
    createStocktake,
    isCreating,
    retryRead: retryBaseRead,
  } = useStocktake()
  const { submitAdjustmentForApproval, isSubmittingAdjustment } =
    useStocktakeAdjustmentSubmission()

  const categoriesQuery = useWarehouseCategoryOptions()

  const [selectedTask, setSelectedTask] = useState<StocktakeTask | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [adjustmentConfirmOpen, setAdjustmentConfirmOpen] = useState(false)

  const selectedTaskId = selectedTask?.id ?? null
  const {
    itemsResource,
    data: items,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useStocktakeItems(selectedTaskId)

  const shellResource = useMemo<StocktakeMgmtShellResource>(() => {
    if (readResource.status === 'error') {
      return readResource
    }

    const categoriesFailure = resolveQueryFailure({
      data: categoriesQuery.data,
      error: categoriesQuery.error,
      isPending: categoriesQuery.isPending,
      scope: 'useStocktakeMgmtViewModel.categories',
      missingMessage:
        '[CRITICAL] Stocktake warehouse categories missing after load',
      failureMessage: '[CRITICAL] Stocktake warehouse categories query failed',
    })
    if (categoriesFailure) {
      return {
        status: 'error',
        error: categoriesFailure.error,
        scope: categoriesFailure.scope,
      }
    }

    if (readResource.status === 'loading' || categoriesQuery.isPending) {
      return { status: 'loading' }
    }

    const filteredCategories = filterWarehouseCategoriesByScene(
      categoriesQuery.data as WarehouseCategoryOption[],
      'stocktake'
    )
    if (filteredCategories.length === 0) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] No warehouse categories allowed for stocktake scene'
        ),
        scope: 'useStocktakeMgmtViewModel.categories',
      }
    }

    return {
      status: 'ready',
      tasks,
      stocktakeCategories: filteredCategories,
    }
  }, [
    categoriesQuery.data,
    categoriesQuery.error,
    categoriesQuery.isPending,
    readResource,
    tasks,
  ])

  useEffect(() => {
    if (shellResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load stocktake shell resources: ${shellResource.scope}`,
      shellResource.error
    )
    failLoudly(shellResource.error, shellResource.scope)
  }, [shellResource])

  const stocktakeCategories =
    shellResource.status === 'ready' ? shellResource.stocktakeCategories : []

  const canSubmitAdjustment =
    selectedTask?.status === 'IN_PROGRESS' ||
    selectedTask?.status === 'COMPLETED'

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
      failLoudly(
        error,
        'useStocktakeMgmtViewModel.handleConfirmAdjustmentSubmission',
        {
          silentUI: true,
        }
      )
    }
  }

  return {
    readResource: shellResource,
    itemsResource,
    tasks,
    isLoading,
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
    retryRead: async () => {
      await Promise.all([retryBaseRead(), categoriesQuery.refetch()])
    },
    retryItems: refetchItems,
  }
}

import { useMemo, useState } from 'react'
import { useMutation, type QueryClient } from '@tanstack/react-query'
import { failLoudly } from '@/lib/safe-catch'
import { InventoryMaintenanceService, type InventoryView } from '../inventory'
import {
  type InventoryThresholdMaterialOption,
  type InventoryThresholdRule,
  type InventoryThresholdRuleWritePayload,
} from '../material-thresholds/data/schema'
import {
  findMaterialThresholdRule,
  invalidateMaterialThresholdState,
  upsertMaterialThresholdRule,
} from '../material-thresholds/services/material-threshold-helpers'
import { warehouseQueryKeys } from '../query-keys'

interface SelectedStockMaterial {
  id: string
  name: string
  code: string
  spec: string
  uom: string
}

interface UseStockMgmtActionsParams {
  thresholdRules: InventoryThresholdRule[] | undefined
  queryClient: QueryClient
  allowsAction: (action: string) => boolean
  showSuccess: (message: string) => void
  getReconcileSuccessMessage: () => string
  getThresholdRuleUpdatedMessage: (materialName: string) => string
}

/**
 * 管理库存页中的阈值配置、对账确认与相关动作编排。
 */
export function useStockMgmtActions({
  thresholdRules,
  queryClient,
  allowsAction,
  showSuccess,
  getReconcileSuccessMessage,
  getThresholdRuleUpdatedMessage,
}: UseStockMgmtActionsParams) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] =
    useState<SelectedStockMaterial | null>(null)
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false)

  const canManageThresholdRule = allowsAction(
    'action_warehouse_category_manage'
  )
  const selectedThresholdRule = useMemo(
    () => findMaterialThresholdRule(thresholdRules, selectedMaterial?.id),
    [selectedMaterial?.id, thresholdRules]
  )
  const selectedMaterialOptions = useMemo<InventoryThresholdMaterialOption[]>(
    () =>
      selectedMaterial
        ? [
            {
              id: selectedMaterial.id,
              code: selectedMaterial.code,
              name: selectedMaterial.name,
              category: '',
              spec: selectedMaterial.spec,
              uom: selectedMaterial.uom,
              status: 'Active',
            },
          ]
        : [],
    [selectedMaterial]
  )

  const closeThresholdDialog = () => {
    setConfigDialogOpen(false)
    setSelectedMaterial(null)
  }

  const reconcileMutation = useMutation({
    mutationFn: () => InventoryMaintenanceService.reconcileInventory(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inventoryList(),
      })
      showSuccess(getReconcileSuccessMessage())
      setReconcileConfirmOpen(false)
    },
    onError: (err) => failLoudly(err, 'StockMgmt.onConfirmReconcile'),
  })

  const saveThresholdRuleMutation = useMutation({
    mutationFn: async (payload: InventoryThresholdRuleWritePayload) => {
      if (!selectedMaterial) {
        throw new Error('[VALIDATION] stock threshold target is missing')
      }

      return upsertMaterialThresholdRule(
        thresholdRules,
        selectedMaterial.id,
        payload
      )
    },
    onSuccess: async () => {
      await invalidateMaterialThresholdState(queryClient)
      showSuccess(
        getThresholdRuleUpdatedMessage(selectedMaterial?.name || '物料')
      )
      closeThresholdDialog()
    },
    onError: (err) => failLoudly(err, 'StockMgmt.handleSaveThresholdRule'),
  })

  const handleHardReconcile = () => {
    if (!allowsAction('action_warehouse_reconcile')) {
      return
    }

    setReconcileConfirmOpen(true)
  }

  const onConfirmReconcile = async () => {
    await reconcileMutation.mutateAsync()
  }

  const handleSaveThresholdRule = async (
    payload: InventoryThresholdRuleWritePayload
  ) => {
    if (!selectedMaterial) {
      return
    }
    if (!canManageThresholdRule) {
      return
    }

    const existingRule = findMaterialThresholdRule(
      thresholdRules,
      selectedMaterial.id
    )
    if (!existingRule && payload.thresholdQty <= 0) {
      closeThresholdDialog()
      return
    }

    await saveThresholdRuleMutation.mutateAsync(payload)
  }

  const handleThresholdDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeThresholdDialog()
      return
    }

    setConfigDialogOpen(true)
  }

  const openThresholdConfig = (item: InventoryView) => {
    if (!canManageThresholdRule) {
      return
    }

    setSelectedMaterial({
      id: item.materialId,
      name: item.materialName,
      code: item.materialCode,
      spec: item.materialSpec,
      uom: item.uom,
    })
    setConfigDialogOpen(true)
  }

  const handleReconcileConfirmOpenChange = (open: boolean) => {
    setReconcileConfirmOpen(open)
  }

  return {
    configDialogOpen,
    selectedMaterial,
    selectedThresholdRule,
    selectedMaterialOptions,
    canManageThresholdRule,
    reconcileConfirmOpen,
    isReconciling: reconcileMutation.isPending,
    isSavingThresholdRule: saveThresholdRuleMutation.isPending,
    handleHardReconcile,
    onConfirmReconcile,
    handleSaveThresholdRule,
    handleThresholdDialogOpenChange,
    openThresholdConfig,
    handleReconcileConfirmOpenChange,
  }
}

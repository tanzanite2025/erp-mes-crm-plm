import { useCallback } from 'react'
import type { OrderEvidence } from '@/features/sales-document/data/order-evidence'
import type { PurchaseOrder } from '../data/schema'
import type {
  CreatePurchaseReturnPayload,
  CreatePurchaseReturnResponse,
} from '../services/purchase-return-service'
import { getPurchaseOrderRemainingQty } from './use-purchase-return-view-model'

export interface PurchaseReturnLineDraft {
  quantity: number
  issueCategory: string
  reason: string
  evidences: OrderEvidence[]
}

interface UsePurchaseReturnActionsParams {
  selectedOrder?: PurchaseOrder
  selectedPendingLines: PurchaseOrder['lines']
  lineDrafts: Record<number, PurchaseReturnLineDraft>
  setLineDrafts: React.Dispatch<
    React.SetStateAction<Record<number, PurchaseReturnLineDraft>>
  >
  issueCategory: string
  reason: string
  remarks: string
  evidences: OrderEvidence[]
  returnDate: string
  createMutation: {
    mutate: (
      variables: {
        purchaseOrderId: string
        payload: CreatePurchaseReturnPayload
      },
      options?: { onSuccess?: (data: CreatePurchaseReturnResponse) => void }
    ) => void
  }
  onCloseDialog: () => void
}

const createEmptyLineDraft = (): PurchaseReturnLineDraft => ({
  quantity: 0,
  issueCategory: '',
  reason: '',
  evidences: [],
})

export function usePurchaseReturnActions({
  selectedOrder,
  selectedPendingLines,
  lineDrafts,
  setLineDrafts,
  issueCategory,
  reason,
  remarks,
  evidences,
  returnDate,
  createMutation,
  onCloseDialog,
}: UsePurchaseReturnActionsParams) {
  const updateLineDraft = useCallback(
    (lineId: number, patch: Partial<PurchaseReturnLineDraft>) => {
      setLineDrafts((prev) => ({
        ...prev,
        [lineId]: {
          ...createEmptyLineDraft(),
          ...prev[lineId],
          ...patch,
        },
      }))
    },
    [setLineDrafts]
  )

  const fillLineRemaining = useCallback(
    (lineId: number) => {
      if (!selectedOrder) return
      updateLineDraft(lineId, {
        quantity: getPurchaseOrderRemainingQty(selectedOrder, lineId),
      })
    },
    [selectedOrder, updateLineDraft]
  )

  const clearLineDraft = useCallback(
    (lineId: number) => {
      updateLineDraft(lineId, createEmptyLineDraft())
    },
    [updateLineDraft]
  )

  const fillAllRemaining = useCallback(() => {
    if (!selectedOrder) return
    setLineDrafts((prev) => {
      const next = { ...prev }
      selectedPendingLines.forEach((line) => {
        if (!line.id) return
        next[line.id] = {
          quantity: getPurchaseOrderRemainingQty(selectedOrder, line.id),
          issueCategory: prev[line.id]?.issueCategory || '',
          reason: prev[line.id]?.reason || '',
          evidences: prev[line.id]?.evidences || [],
        }
      })
      return next
    })
  }, [selectedOrder, selectedPendingLines, setLineDrafts])

  const clearAllDrafts = useCallback(() => {
    setLineDrafts((prev) => {
      const next = { ...prev }
      selectedPendingLines.forEach((line) => {
        if (!line.id) return
        next[line.id] = {
          ...createEmptyLineDraft(),
        }
      })
      return next
    })
  }, [selectedPendingLines, setLineDrafts])

  const handleSubmit = useCallback(() => {
    if (!selectedOrder) return
    const lines = Object.entries(lineDrafts)
      .map(([key, value]) => ({
        purchaseOrderLineId: Number(key),
        quantity: Number(value.quantity || 0),
        price:
          selectedOrder.lines.find((line) => line.id === Number(key))?.price ||
          0,
        issueCategory: value.issueCategory.trim() || issueCategory || undefined,
        reason: value.reason.trim() || undefined,
        evidences: value.evidences,
      }))
      .filter((item) => item.quantity > 0)

    if (lines.length === 0) return

    createMutation.mutate(
      {
        purchaseOrderId: selectedOrder.id,
        payload: {
          issueCategory: issueCategory || undefined,
          reason: reason.trim() || undefined,
          remarks: remarks.trim() || undefined,
          evidences,
          returnDate: new Date(`${returnDate}T00:00:00`).toISOString(),
          lines,
        },
      },
      {
        onSuccess: () => {
          onCloseDialog()
        },
      }
    )
  }, [
    createMutation,
    evidences,
    issueCategory,
    lineDrafts,
    onCloseDialog,
    remarks,
    reason,
    returnDate,
    selectedOrder,
  ])

  return {
    clearAllDrafts,
    clearLineDraft,
    fillAllRemaining,
    fillLineRemaining,
    handleSubmit,
    updateLineDraft,
  }
}

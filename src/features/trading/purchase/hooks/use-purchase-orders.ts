import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder, type PurchaseOrderLine } from '../../data/schema'
import { executePurchaseOrderReceiptConfirmation, purchaseOrderHeaderTransactions, purchaseOrderLineTransactions, type ConfirmPurchaseReceiptPayload } from '../services/purchase-transaction-service'
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrders,
  patchPurchaseOrder,
  type PaginatedResponse,
} from '../services/purchase-service'

function invalidatePurchaseOrderQueries(queryClient: ReturnType<typeof useQueryClient>, orderId?: string) {
  queryClient.invalidateQueries({ queryKey: tradingQueryKeys.purchaseOrdersRoot() })

  if (orderId) {
    queryClient.invalidateQueries({ queryKey: tradingQueryKeys.purchaseOrderDetail(orderId) })
  }
}

export const useGetPurchaseOrders = (page = 1, pageSize = 50) => {
  return useQuery<PaginatedResponse<PurchaseOrder>, Error>({
    queryKey: tradingQueryKeys.purchaseOrders(page, pageSize),
    queryFn: () => getPurchaseOrders(page, pageSize),
  })
}

export const useGetPurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: tradingQueryKeys.purchaseOrderDetail(id),
    queryFn: () => getPurchaseOrderById(id),
    enabled: !!id,
  })
}

export const usePurchaseOrderMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const handleSavedSuccess = (orderId?: string) => {
    toast.success(t('purchase.orders.toasts.saved'))
    invalidatePurchaseOrderQueries(queryClient, orderId)
  }

  const handleDeletedSuccess = () => {
    toast.success(t('purchase.orders.toasts.voided'))
    invalidatePurchaseOrderQueries(queryClient)
  }

  const handleConfirmReceiptSuccess = (orderId?: string) => {
    toast.success(t('purchase.orders.toasts.receiptConfirmed'))
    invalidatePurchaseOrderQueries(queryClient, orderId)
  }

  const createMutation = useMutation({
    mutationFn: (data: Omit<PurchaseOrder, 'id' | 'version'>) => createPurchaseOrder(data),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const saveMutation = useMutation({
    mutationFn: ({
      orderId,
      delta,
      finalData,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      delta: DeltaSet
      finalData: PurchaseOrder
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderHeaderTransactions.savePurchaseOrder(orderId, { delta, finalData, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const supplierChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      supplierId,
      supplierName,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      supplierId: string
      supplierName: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderHeaderTransactions.changePurchaseOrderSupplier(orderId, { supplierId, supplierName, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const lineRemoveMutation = useMutation({
    mutationFn: ({
      orderId,
      lines,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      lines: PurchaseOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderLineTransactions.changePurchaseOrderLineRemove(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const lineAddMutation = useMutation({
    mutationFn: ({
      orderId,
      lines,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      lines: PurchaseOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderLineTransactions.changePurchaseOrderLineAdd(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const lineContentChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      lines,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      lines: PurchaseOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderLineTransactions.changePurchaseOrderLineContent(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: DeltaSet; version: number }) =>
      patchPurchaseOrder(id, delta, version),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const expectedDateChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      expectedDate,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      expectedDate: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => purchaseOrderHeaderTransactions.changePurchaseOrderExpectedDate(orderId, { expectedDate, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      handleSavedSuccess(data.id)
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
      handleDeletedSuccess()
    },
    onError: handleServerError,
  })

  const confirmReceiptMutation = useMutation({
    mutationFn: ({ id, payload, expectedVersion, actorId }: { id: string; payload: ConfirmPurchaseReceiptPayload; expectedVersion: number; actorId?: string }) =>
      executePurchaseOrderReceiptConfirmation(id, {
        operator: payload.operator || 'unknown',
        remarks: payload.remarks,
        receiptDate: payload.receiptDate,
        lines: payload.lines,
        expectedVersion,
        actorId,
      }),
    onSuccess: (data) => {
      handleConfirmReceiptSuccess(data.purchaseOrder.id)
    },
    onError: handleServerError,
  })

  const createSaveMutations = {
    createMutation,
    saveMutation,
    patchMutation,
    deleteMutation,
  }

  const lineEditMutations = {
    lineAddMutation,
    lineRemoveMutation,
    lineContentChangeMutation,
  }

  const workflowMutations = {
    supplierChangeMutation,
    expectedDateChangeMutation,
    confirmReceiptMutation,
  }

  return {
    ...createSaveMutations,
    ...lineEditMutations,
    ...workflowMutations,
    createSaveMutations,
    lineEditMutations,
    workflowMutations,
  }
}

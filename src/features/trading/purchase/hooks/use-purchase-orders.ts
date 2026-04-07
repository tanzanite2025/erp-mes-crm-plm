import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../../data/schema'
import {
  confirmPurchaseReceipt,
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrders,
  patchPurchaseOrder,
  type ConfirmPurchaseReceiptPayload,
  type PaginatedResponse,
} from '../services/purchase-service'

export const useGetPurchaseOrders = (page = 1, pageSize = 50) => {
  return useQuery<PaginatedResponse<PurchaseOrder>, Error>({
    queryKey: ['purchase-orders', page, pageSize],
    queryFn: () => getPurchaseOrders(page, pageSize),
  })
}

export const useGetPurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => getPurchaseOrderById(id),
    enabled: !!id,
  })
}

export const usePurchaseOrderMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: Omit<PurchaseOrder, 'id' | 'version'>) => createPurchaseOrder(data),
    onSuccess: (data) => {
      toast.success(t('purchase.orders.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.id] })
    },
    onError: handleServerError,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: DeltaSet; version: number }) =>
      patchPurchaseOrder(id, delta, version),
    onSuccess: (data) => {
      toast.success(t('purchase.orders.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.id] })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
      toast.success(t('purchase.orders.toasts.voided'))
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: handleServerError,
  })

  const confirmReceiptMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConfirmPurchaseReceiptPayload }) =>
      confirmPurchaseReceipt(id, payload),
    onSuccess: (data) => {
      toast.success(t('purchase.orders.toasts.receiptConfirmed'))
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchaseOrder.id] })
    },
    onError: handleServerError,
  })

  return { createMutation, patchMutation, deleteMutation, confirmReceiptMutation }
}

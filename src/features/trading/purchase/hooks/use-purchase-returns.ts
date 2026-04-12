import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { handleServerError } from '@/lib/handle-server-error'
import {
  createPurchaseReturn,
  getPurchaseReturns,
  type CreatePurchaseReturnPayload,
  type PaginatedPurchaseReturns,
} from '../services/purchase-return-service'

export function useGetPurchaseReturns(page = 1, pageSize = 50) {
  return useQuery<PaginatedPurchaseReturns, Error>({
    queryKey: tradingQueryKeys.purchaseReturns(page, pageSize),
    queryFn: () => getPurchaseReturns(page, pageSize),
  })
}

export function usePurchaseReturnMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: ({
      purchaseOrderId,
      payload,
    }: {
      purchaseOrderId: string
      payload: CreatePurchaseReturnPayload
    }) => createPurchaseReturn(purchaseOrderId, payload),
    onSuccess: (data) => {
      toast.success(t('purchase.orders.toasts.returnCreated'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.purchaseOrdersRoot() })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.purchaseOrderDetail(data.purchaseOrder.id) })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.purchaseReturnsRoot() })
    },
    onError: handleServerError,
  })

  return { createMutation }
}

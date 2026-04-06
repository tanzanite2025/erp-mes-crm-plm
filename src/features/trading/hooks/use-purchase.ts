import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { handleServerError } from '@/lib/handle-server-error'
import { type PurchaseOrder } from '../data/schema'
import * as purchaseService from '../services/purchase-service'

export const useGetPurchaseOrders = (page = 1, pageSize = 50) => {
    return useQuery<purchaseService.PaginatedResponse<PurchaseOrder>, Error>({
        queryKey: ['purchase-orders', page, pageSize],
        queryFn: () => purchaseService.getPurchaseOrders(page, pageSize),
    })
}

export const useGetPurchaseOrderDetail = (id: string) => {
    return useQuery({
        queryKey: ['purchase-orders', id],
        queryFn: () => purchaseService.getPurchaseOrderById(id),
        enabled: !!id,
    })
}

export const usePurchaseOrderMutations = () => {
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const saveMutation = useMutation({
        mutationFn: purchaseService.savePurchaseOrder,
        onSuccess: (data) => {
            toast.success(t('purchase.orders.toasts.saved'))
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.id] })
        },
        onError: handleServerError,
    })

    const deleteMutation = useMutation({
        mutationFn: purchaseService.deletePurchaseOrder,
        onSuccess: () => {
            toast.success(t('purchase.orders.toasts.voided'))
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        },
        onError: handleServerError,
    })

    const confirmReceiptMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: purchaseService.ConfirmPurchaseReceiptPayload }) =>
            purchaseService.confirmPurchaseReceipt(id, payload),
        onSuccess: (data) => {
            toast.success(t('purchase.orders.toasts.receiptConfirmed'))
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchaseOrder.id] })
        },
        onError: handleServerError,
    })

    return { saveMutation, deleteMutation, confirmReceiptMutation }
}

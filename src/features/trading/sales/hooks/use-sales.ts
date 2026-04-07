import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder } from '../../data/schema'
import {
  claimOrderLine,
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrderById,
  getSalesOrders,
  patchSalesOrder,
} from '../services/sales-service'

export const useGetSalesOrders = (page = 1, pageSize = 50, options = {}) => {
  return useQuery({
    queryKey: ['sales-orders', page, pageSize],
    queryFn: () => getSalesOrders({ page, pageSize }),
    ...options,
  })
}

export const useGetSalesOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: () => getSalesOrderById(id),
    enabled: !!id,
  })
}

export const useSalesOrderMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: Omit<SalesOrder, 'id' | 'version'>) => createSalesOrder(data),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))

      if (data.status === 'Pending') {
        NotificationService.dispatch('ORDER_EVENT', {
          action: 'STATUS_CHANGED',
          targetStatus: 'Pending',
          title: t('tradingSalesOrder.notifications.pendingClaimTitle'),
          content: t('tradingSalesOrder.notifications.pendingClaimContent', {
            orderNo: data.orderNo,
            customerName: data.customerName,
          }),
          priority: 'info',
          actionUrl: `/trading/sales-orders?search=${data.orderNo}&detailId=${data.id}`,
          metadata: { orderId: data.id, orderNo: data.orderNo, OrderNo: data.orderNo, OrderId: data.id },
        })
      }

      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: () => {
      toast.success(t('tradingSalesOrder.toasts.voided'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: handleServerError,
  })

  const claimMutation = useMutation({
    mutationFn: ({ orderId, lineNos, operator }: { orderId: string; lineNos: number[]; operator: string }) =>
      claimOrderLine(orderId, lineNos, operator),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.claimed'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
    },
    onError: handleServerError,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: DeltaSet; version: number }) =>
      patchSalesOrder(id, delta, version),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  return { createMutation, patchMutation, deleteMutation, claimMutation }
}

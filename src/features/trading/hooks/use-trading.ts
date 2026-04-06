import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import { handleServerError } from '@/lib/handle-server-error'
import * as tradingService from '../services/trading-service'

export const useGetCustomers = (options = {}) => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: tradingService.getCustomers,
    ...options,
  })
}

export const useCustomerMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const resolveCustomerErrorMessage = (
    error: unknown,
    fallbackKey: 'trading.customers.errors.saveFailed' | 'trading.customers.errors.deleteFailed'
  ) => {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'CONFLICT') return t('trading.customers.errors.conflict')
      if (error.code === 'CUSTOMER_DELETE_BLOCKED') {
        return t('trading.customers.errors.deleteBlocked')
      }
    }

    if (error && typeof error === 'object' && 'status' in error && Number(error.status) === 409) {
      return t('trading.customers.errors.conflict')
    }

    return t(fallbackKey)
  }

  const saveMutation = useMutation({
    mutationFn: tradingService.saveCustomer,
    onSuccess: (_data, variables) => {
      toast.success(
        variables?.id ? t('trading.customers.toasts.updated') : t('trading.customers.toasts.created')
      )
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(resolveCustomerErrorMessage(error, 'trading.customers.errors.saveFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tradingService.deleteCustomer,
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.deleted'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(resolveCustomerErrorMessage(error, 'trading.customers.errors.deleteFailed'))
    },
  })

  return { saveMutation, deleteMutation }
}

export const useGetSuppliers = (options = {}) => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: tradingService.getSuppliers,
    ...options,
  })
}

export const useSupplierMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: tradingService.saveSupplier,
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: tradingService.deleteSupplier,
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.deleted'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: handleServerError,
  })

  return { saveMutation, deleteMutation }
}

export const useGetSalesOrders = (page = 1, pageSize = 50, options = {}) => {
  return useQuery({
    queryKey: ['sales-orders', page, pageSize],
    queryFn: () => tradingService.getSalesOrders(page, pageSize),
    ...options,
  })
}

export const useGetPurchaseOrders = (page = 1, pageSize = 50) => {
  return useQuery({
    queryKey: ['purchase-orders', page, pageSize],
    queryFn: () => tradingService.getPurchaseOrders(page, pageSize),
  })
}

export const useGetSalesOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: () => tradingService.getSalesOrderById(id),
    enabled: !!id,
  })
}

export const useSalesOrderMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: tradingService.saveSalesOrder,
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
    mutationFn: tradingService.deleteSalesOrder,
    onSuccess: () => {
      toast.success(t('tradingSalesOrder.toasts.voided'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: handleServerError,
  })

  const claimMutation = useMutation({
    mutationFn: ({
      orderId,
      lineNos,
      operator,
    }: {
      orderId: string
      lineNos: number[]
      operator: string
    }) => tradingService.claimOrderLine(orderId, lineNos, operator),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.claimed'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
    },
    onError: handleServerError,
  })

  return { saveMutation, deleteMutation, claimMutation }
}

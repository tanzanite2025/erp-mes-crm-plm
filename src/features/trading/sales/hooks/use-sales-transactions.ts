import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderLine } from '../../data/schema'
import { addSalesOrderLine, cancelSalesOrder, changeSalesOrderClassificationType, changeSalesOrderCustomer, changeSalesOrderDeliveryDate, changeSalesOrderLineContent, changeSalesOrderLines, changeSalesOrderName, changeSalesOrderPurchaseOrderNo, changeSalesOrderRequirements, claimSalesOrderLines, removeSalesOrderLine, transitionSalesOrderStatus } from '../services/sales-transaction-service'
import { createSalesOrder, deleteSalesOrder, patchSalesOrder } from '../services/sales-service'

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

  const purchaseOrderNoChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      purchaseOrderNo,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      purchaseOrderNo: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderPurchaseOrderNo(orderId, { purchaseOrderNo, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const orderNameChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      orderName,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      orderName: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderName(orderId, { orderName, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const requirementsChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      requirements,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      requirements: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderRequirements(orderId, { requirements, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const deliveryDateChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      deliveryDate,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      deliveryDate: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderDeliveryDate(orderId, { deliveryDate, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const classificationTypeChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      classification,
      type,
      barcode,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      classification?: string
      type?: string
      barcode?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderClassificationType(orderId, { classification, type, barcode, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const linesChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      lines,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      lines: SalesOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderLines(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
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
      lines: SalesOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderLineContent(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
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
      lines: SalesOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => addSalesOrderLine(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
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
      lines: SalesOrderLine[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => removeSalesOrderLine(orderId, { lines, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const customerChangeMutation = useMutation({
    mutationFn: ({
      orderId,
      customerId,
      customerName,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      customerId?: string
      customerName: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSalesOrderCustomer(orderId, { customerId, customerName, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const statusTransitionMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      statusNote,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      status: string
      statusNote?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => transitionSalesOrderStatus(orderId, { status, statusNote, operator, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
    },
    onError: handleServerError,
  })

  const cancelMutation = useMutation({
    mutationFn: ({
      orderId,
      operator,
      reason,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      operator: string
      reason?: string
      expectedVersion: number
      actorId?: string
    }) => cancelSalesOrder(orderId, { operator, reason, expectedVersion, actorId }),
    onSuccess: (data) => {
      toast.success(t('tradingSalesOrder.toasts.voided'))
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
    mutationFn: ({
      orderId,
      lineNos,
      operator,
      expectedVersion,
      actorId,
    }: {
      orderId: string
      lineNos: number[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => claimSalesOrderLines(orderId, { lineNos, operator, expectedVersion, actorId }),
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

  return { createMutation, patchMutation, deleteMutation, claimMutation, statusTransitionMutation, cancelMutation, customerChangeMutation, deliveryDateChangeMutation, orderNameChangeMutation, purchaseOrderNoChangeMutation, requirementsChangeMutation, classificationTypeChangeMutation, linesChangeMutation, lineContentChangeMutation, lineAddMutation, lineRemoveMutation }
}

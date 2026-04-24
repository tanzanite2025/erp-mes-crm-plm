import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderFormValues, type SalesOrderLine } from '../../data/schema'
import { addSalesOrderLine, cancelSalesOrder, changeSalesOrderClassificationType, changeSalesOrderCustomer, changeSalesOrderDeliveryDate, changeSalesOrderLineContent, changeSalesOrderLines, changeSalesOrderPurchaseOrderNo, changeSalesOrderRequirements, claimSalesOrderLines, removeSalesOrderLine, transitionSalesOrderStatus } from '../services/sales-transaction-service'
import { createSalesOrder, deleteSalesOrder, patchSalesOrder } from '../services/sales-service'

interface SalesOrderListCache {
  items: SalesOrder[]
  total: number
  page: number
  pageSize: number
}

function isSalesOrder(value: unknown): value is SalesOrder {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Partial<SalesOrder>).id === 'string' &&
    'status' in value
  )
}

function isSalesOrderListCache(value: unknown): value is SalesOrderListCache {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as Partial<SalesOrderListCache>).items)
  )
}

const updateSalesOrderInCaches = (queryClient: QueryClient, order: SalesOrder) => {
  queryClient.setQueriesData({ queryKey: tradingQueryKeys.salesOrdersRoot() }, (current: unknown) => {
    if (isSalesOrderListCache(current)) {
      return {
        ...current,
        items: current.items.map((item) => (item.id === order.id ? { ...item, ...order } : item)),
      }
    }
    if (isSalesOrder(current) && current.id === order.id) {
      return { ...current, ...order }
    }
    return current
  })
}

const removeSalesOrderFromCaches = (queryClient: QueryClient, orderId: string) => {
  queryClient.setQueriesData({ queryKey: tradingQueryKeys.salesOrdersRoot() }, (current: unknown) => {
    if (isSalesOrderListCache(current)) {
      const items = current.items.filter((item) => item.id !== orderId)
      return {
        ...current,
        items,
        total: Math.max(0, current.total - (items.length === current.items.length ? 0 : 1)),
      }
    }
    if (isSalesOrder(current) && current.id === orderId) {
      return undefined
    }
    return current
  })
}

const markSalesOrderCanceledInCaches = (queryClient: QueryClient, orderId: string) => {
  queryClient.setQueriesData({ queryKey: tradingQueryKeys.salesOrdersRoot() }, (current: unknown) => {
    if (isSalesOrderListCache(current)) {
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === orderId ? { ...item, status: 'Canceled' as const } : item
        ),
      }
    }
    if (isSalesOrder(current) && current.id === orderId) {
      return { ...current, status: 'Canceled' as const }
    }
    return current
  })
}

const isAlreadyCanceledError = (error: unknown) => {
  if (!(error instanceof Error)) return false
  return error.message.toLowerCase().includes('order already canceled')
}

const invalidateSalesOrderReads = async (queryClient: QueryClient, orderId?: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrdersRoot() }),
    ...(orderId
      ? [queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrderDetail(orderId) })]
      : []),
  ])
}

export const useSalesOrderMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const invalidateSalesReads = (orderId?: string) => invalidateSalesOrderReads(queryClient, orderId)
  const handleSavedSuccess = (orderId: string) => {
    toast.success(t('tradingSalesOrder.toasts.saved'))
    void invalidateSalesReads(orderId)
  }
  const handleVoidedSuccess = (orderId?: string) => {
    toast.success(t('tradingSalesOrder.toasts.voided'))
    void invalidateSalesReads(orderId)
  }

  const createMutation = useMutation({
    mutationFn: (data: SalesOrderFormValues) => createSalesOrder(data),
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
      finalData: SalesOrderFormValues
      operator: string
      expectedVersion: number
      actorId?: string
    }) => {
      void finalData
      void operator
      void actorId
      return patchSalesOrder(orderId, delta, expectedVersion)
    },
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
    onSuccess: (data) => handleSavedSuccess(data.id),
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
      updateSalesOrderInCaches(queryClient, data)
      handleVoidedSuccess(data.id)
    },
    onError: (error, variables) => {
      if (isAlreadyCanceledError(error)) {
        markSalesOrderCanceledInCaches(queryClient, variables.orderId)
        handleVoidedSuccess(variables.orderId)
        return
      }
      handleServerError(error)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: async (_data, orderId) => {
      removeSalesOrderFromCaches(queryClient, orderId)
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesReturnsRoot(),
      })
      await queryClient.invalidateQueries({
        queryKey: ['sales-returns', 'source-orders'],
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerSalesReturnSummary(),
      })
      handleVoidedSuccess()
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
      void invalidateSalesReads(data.id)
    },
    onError: handleServerError,
  })

  return { createMutation, saveMutation, deleteMutation, claimMutation, statusTransitionMutation, cancelMutation, customerChangeMutation, deliveryDateChangeMutation, purchaseOrderNoChangeMutation, requirementsChangeMutation, classificationTypeChangeMutation, linesChangeMutation, lineContentChangeMutation, lineAddMutation, lineRemoveMutation }
}

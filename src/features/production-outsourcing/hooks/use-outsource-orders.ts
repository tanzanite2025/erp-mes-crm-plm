import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import type {
  OutsourceOrder,
  OutsourceOrderFormValues,
  OutsourceInspectionFormValues,
  OutsourceTransferFormValues,
} from '../data/outsource-order'
import {
  outsourceDiagnosticsQueryKeys,
  outsourceOrderQueryKeys,
  type OutsourceOrderFilters,
} from '../query-keys'
import {
  cancelOutsourceOrder,
  createOutsourceOrder,
  deleteOutsourceOrder,
  getOutsourceDiagnostics,
  getOutsourceOrders,
  inspectOutsourceOrderLine,
  releaseOutsourceOrder,
  returnOutsourceOrderLine,
  sendOutsourceOrderLine,
  updateOutsourceOrder,
} from '../services/outsource-orders-service'

export function useOutsourceOrders(filters: OutsourceOrderFilters = {}) {
  return useQuery({
    queryKey: outsourceOrderQueryKeys.list(filters),
    queryFn: () => getOutsourceOrders(filters),
  })
}

export function useOutsourceDiagnostics() {
  return useQuery({
    queryKey: outsourceDiagnosticsQueryKeys.status(),
    queryFn: getOutsourceDiagnostics,
  })
}

export function useOutsourceOrderMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const invalidateOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: outsourceOrderQueryKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey: outsourceDiagnosticsQueryKeys.all,
      }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (values: OutsourceOrderFormValues) =>
      createOutsourceOrder(values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.saved'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      order,
      values,
    }: {
      order: OutsourceOrder
      values: OutsourceOrderFormValues
    }) => updateOutsourceOrder(order, values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.saved'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const releaseMutation = useMutation({
    mutationFn: releaseOutsourceOrder,
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.released'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOutsourceOrder,
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.canceled'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOutsourceOrder,
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.deleted'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const sendLineMutation = useMutation({
    mutationFn: ({
      lineId,
      values,
    }: {
      lineId: string
      values: OutsourceTransferFormValues
    }) => sendOutsourceOrderLine(lineId, values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.execution.toasts.sent'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const returnLineMutation = useMutation({
    mutationFn: ({
      lineId,
      values,
    }: {
      lineId: string
      values: OutsourceTransferFormValues
    }) => returnOutsourceOrderLine(lineId, values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.execution.toasts.returned'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  const inspectLineMutation = useMutation({
    mutationFn: ({
      lineId,
      values,
    }: {
      lineId: string
      values: OutsourceInspectionFormValues
    }) => inspectOutsourceOrderLine(lineId, values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.execution.toasts.inspected'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  return {
    createMutation,
    updateMutation,
    releaseMutation,
    cancelMutation,
    deleteMutation,
    sendLineMutation,
    returnLineMutation,
    inspectLineMutation,
  }
}

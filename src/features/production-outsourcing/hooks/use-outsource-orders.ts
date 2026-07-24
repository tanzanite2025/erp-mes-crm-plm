import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import type {
  OutsourceOrder,
  OutsourceOrderFormValues,
} from '../data/outsource-order'
import {
  outsourceOrderQueryKeys,
  type OutsourceOrderFilters,
} from '../query-keys'
import {
  createOutsourceOrder,
  deleteOutsourceOrder,
  getOutsourceOrders,
  releaseOutsourceOrder,
  updateOutsourceOrder,
} from '../services/outsource-orders-service'

export function useOutsourceOrders(filters: OutsourceOrderFilters = {}) {
  return useQuery({
    queryKey: outsourceOrderQueryKeys.list(filters),
    queryFn: () => getOutsourceOrders(filters),
  })
}

export function useOutsourceOrderMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const invalidateOrders = () =>
    queryClient.invalidateQueries({
      queryKey: outsourceOrderQueryKeys.all,
    })

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

  const deleteMutation = useMutation({
    mutationFn: deleteOutsourceOrder,
    onSuccess: () => {
      toast.success(t('productionOutsourcing.orders.toasts.deleted'))
      void invalidateOrders()
    },
    onError: handleServerError,
  })

  return {
    createMutation,
    updateMutation,
    releaseMutation,
    deleteMutation,
  }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type DeltaSet } from '@/lib/delta/types'
import { type Customer } from '../../data/schema'
import { createCustomer, deleteCustomer, getCustomers, patchCustomer } from '../services/customer-service'

export const useGetCustomers = (options = {}) => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
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

  const createMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'version'>) => {
      return createCustomer(data)
    },
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.created'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(resolveCustomerErrorMessage(error, 'trading.customers.errors.saveFailed'))
    },
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: DeltaSet; version: number }) => {
      return patchCustomer(id, delta, version)
    },
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.updated'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(resolveCustomerErrorMessage(error, 'trading.customers.errors.saveFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.deleted'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(resolveCustomerErrorMessage(error, 'trading.customers.errors.deleteFailed'))
    },
  })

  return { createMutation, patchMutation, deleteMutation }
}

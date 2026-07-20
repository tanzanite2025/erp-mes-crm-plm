import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { useLanguage } from '@/context/language-provider'
import { type Customer, type CustomerFormValues } from '../../data/schema'
import { tradingQueryKeys } from '../../query-keys'
import {
  type CustomerListResponse,
  type CustomerListParams,
  changeCustomerIdentity,
  changeCustomerStatus,
  createCustomer,
  deleteCustomer,
  getCustomerList,
  getCustomers,
  patchCustomer,
  saveCustomer,
} from '../services/customer-service'

export const useGetCustomers = (options = {}) => {
  return useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
    ...options,
  })
}

export const useGetCustomerList = (
  params: CustomerListParams = {},
  options = {}
) => {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search?.trim() ?? ''
  const includeDeleted = params.includeDeleted ?? false
  const query = useQuery({
    queryKey: [
      ...tradingQueryKeys.customerList(),
      page,
      pageSize,
      search,
      includeDeleted,
    ],
    queryFn: () => getCustomerList({ page, pageSize, search, includeDeleted }),
    placeholderData: (previousData) => previousData,
    ...options,
  })

  const readResource = useMemo<ReadResource<CustomerListResponse>>(() => {
    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useGetCustomerList.list',
      missingMessage: '[CRITICAL] Customer list missing after load',
      failureMessage: '[CRITICAL] Customer list query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (query.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: query.data as CustomerListResponse,
    }
  }, [query.data, query.error, query.isPending])

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    isPending: query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
    readResource,
  }
}

export const useCustomerMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const resolveCustomerErrorMessage = (
    error: unknown,
    fallbackKey:
      | 'trading.customers.errors.saveFailed'
      | 'trading.customers.errors.deleteFailed'
  ) => {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'CONFLICT')
        return t('trading.customers.errors.conflict')
      if (error.code === 'CUSTOMER_DELETE_BLOCKED') {
        return t('trading.customers.errors.deleteBlocked')
      }
    }

    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      Number(error.status) === 409
    ) {
      return t('trading.customers.errors.conflict')
    }

    return t(fallbackKey)
  }

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => {
      return createCustomer(data)
    },
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.created'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.saveFailed'
        )
      )
    },
  })

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      version,
    }: {
      id: string
      delta: DeltaSet
      version: number
    }) => {
      return patchCustomer(id, delta, version)
    },
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.updated'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.saveFailed'
        )
      )
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      finalData,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      delta: DeltaSet
      finalData: Customer
      operator: string
      expectedVersion: number
      actorId?: string
    }) =>
      saveCustomer(id, {
        delta,
        finalData,
        operator,
        expectedVersion,
        actorId,
      }),
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.updated'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.saveFailed'
        )
      )
    },
  })

  const statusChangeMutation = useMutation({
    mutationFn: ({
      id,
      status,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      status: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) =>
      changeCustomerStatus(id, { status, operator, expectedVersion, actorId }),
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.updated'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.saveFailed'
        )
      )
    },
  })

  const identityChangeMutation = useMutation({
    mutationFn: ({
      id,
      code,
      name,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      code?: string
      name?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) =>
      changeCustomerIdentity(id, {
        code,
        name,
        operator,
        expectedVersion,
        actorId,
      }),
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.updated'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.saveFailed'
        )
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast.success(t('trading.customers.toasts.deleted'))
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customers() })
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerList(),
      })
    },
    onError: (error) => {
      toast.error(
        resolveCustomerErrorMessage(
          error,
          'trading.customers.errors.deleteFailed'
        )
      )
    },
  })

  return {
    createMutation,
    saveMutation,
    patchMutation,
    statusChangeMutation,
    identityChangeMutation,
    deleteMutation,
  }
}

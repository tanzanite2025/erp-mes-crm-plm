import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { tradingQueryKeys } from '../../query-keys'
import { type CustomerSalesClosureSummaryListResponse, getCustomerSalesClosureSummaryList } from '../services/customer-sales-closure-summary-service'

export function useGetCustomerSalesClosureSummary(options = {}) {
  const query = useQuery({
    queryKey: tradingQueryKeys.customerSalesClosureSummary(),
    queryFn: getCustomerSalesClosureSummaryList,
    ...options,
  })

  const readResource = useMemo<ReadResource<CustomerSalesClosureSummaryListResponse>>(() => {
    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useGetCustomerSalesClosureSummary.summary',
      missingMessage: '[CRITICAL] Customer sales closure summary missing after load',
      failureMessage: '[CRITICAL] Customer sales closure summary query failed',
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
      data: query.data as CustomerSalesClosureSummaryListResponse,
    }
  }, [query.data, query.error, query.isPending])

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    isPending: query.isPending,
    refetch: query.refetch,
    readResource,
  }
}

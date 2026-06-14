import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { tradingQueryKeys } from '../../query-keys'
import {
  type CustomerSalesReturnSummaryListResponse,
  getCustomerSalesReturnSummaryList,
} from '../services/customer-sales-return-summary-service'

export function useGetCustomerSalesReturnSummary(options = {}) {
  const query = useQuery({
    queryKey: tradingQueryKeys.customerSalesReturnSummary(),
    queryFn: getCustomerSalesReturnSummaryList,
    ...options,
  })

  const readResource = useMemo<
    ReadResource<CustomerSalesReturnSummaryListResponse>
  >(() => {
    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useGetCustomerSalesReturnSummary.summary',
      missingMessage:
        '[CRITICAL] Customer sales return summary missing after load',
      failureMessage: '[CRITICAL] Customer sales return summary query failed',
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
      data: query.data as CustomerSalesReturnSummaryListResponse,
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

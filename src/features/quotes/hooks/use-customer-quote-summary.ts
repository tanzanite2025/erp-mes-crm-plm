import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import {
  listCustomerQuoteSummary,
  type CustomerQuoteSummaryItem,
} from '@/features/quotes/services/customer-quote-summary-service'

const emptyItems: CustomerQuoteSummaryItem[] = []

export function useCustomerQuoteSummary(customerId: string | undefined) {
  const normalizedCustomerId = customerId?.trim() ?? ''
  const query = useQuery({
    queryKey: quoteQueryKeys.customerSummary(normalizedCustomerId),
    queryFn: () => listCustomerQuoteSummary(normalizedCustomerId),
    enabled: normalizedCustomerId.length > 0,
  })

  const items = useMemo(() => query.data ?? emptyItems, [query.data])

  return {
    items,
    hasQuotes: items.length > 0,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  }
}

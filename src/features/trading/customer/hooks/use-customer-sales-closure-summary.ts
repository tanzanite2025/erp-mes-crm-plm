import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '../../query-keys'
import { getCustomerSalesClosureSummaryList } from '../services/customer-sales-closure-summary-service'

export function useGetCustomerSalesClosureSummary(options = {}) {
  return useQuery({
    queryKey: tradingQueryKeys.customerSalesClosureSummary(),
    queryFn: getCustomerSalesClosureSummaryList,
    ...options,
  })
}

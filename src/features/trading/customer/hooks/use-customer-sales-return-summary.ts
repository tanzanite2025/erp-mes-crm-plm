import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '../../query-keys'
import { getCustomerSalesReturnSummaryList } from '../services/customer-sales-return-summary-service'

export function useGetCustomerSalesReturnSummary(options = {}) {
  return useQuery({
    queryKey: tradingQueryKeys.customerSalesReturnSummary(),
    queryFn: getCustomerSalesReturnSummaryList,
    ...options,
  })
}

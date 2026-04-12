import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  getPayables,
  searchPayableLedgers,
  type PayableLedgerSearchParams,
} from '../services/payables-query-service'

export function useGetPayables() {
  return useQuery({
    queryKey: tradingQueryKeys.payables(),
    queryFn: () => getPayables(),
  })
}

export function useSearchPayableLedgers(params: PayableLedgerSearchParams) {
  const { keyword, status, currency, outstandingMin, outstandingMax, sortBy, sortOrder } = params

  return useQuery({
    queryKey: tradingQueryKeys.payableSearch(
      keyword,
      status,
      currency,
      outstandingMin,
      outstandingMax,
      sortBy,
      sortOrder
    ),
    queryFn: () =>
      searchPayableLedgers({ keyword, status, currency, outstandingMin, outstandingMax, sortBy, sortOrder }),
    enabled: keyword.trim().length >= 2,
  })
}

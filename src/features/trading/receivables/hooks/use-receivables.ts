import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  getReceivables,
  searchReceivableLedgers,
  type ReceivableLedgerSearchParams,
} from '../services/receivables-query-service'

export function useGetReceivables() {
  return useQuery({
    queryKey: tradingQueryKeys.receivables(),
    queryFn: () => getReceivables(),
  })
}

export function useSearchReceivableLedgers(params: ReceivableLedgerSearchParams) {
  const { keyword, status, currency, outstandingMin, outstandingMax, sortBy, sortOrder } = params

  return useQuery({
    queryKey: tradingQueryKeys.receivableSearch(
      keyword,
      status,
      currency,
      outstandingMin,
      outstandingMax,
      sortBy,
      sortOrder
    ),
    queryFn: () =>
      searchReceivableLedgers({ keyword, status, currency, outstandingMin, outstandingMax, sortBy, sortOrder }),
    enabled: keyword.trim().length >= 2,
  })
}

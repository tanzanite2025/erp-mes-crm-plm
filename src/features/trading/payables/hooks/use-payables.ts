import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  getPayables,
  searchPayableLedgers,
  type PayableListQueryParams,
  type PayableLedgerSearchParams,
} from '../services/payables-query-service'

export function useGetPayables(params: PayableListQueryParams = {}) {
  const sourceType = params.sourceType?.trim() ?? ''
  const sourceRefId = params.sourceRefId?.trim() ?? ''

  return useQuery({
    queryKey: tradingQueryKeys.payables(sourceType, sourceRefId),
    queryFn: () => getPayables({ sourceType, sourceRefId }),
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

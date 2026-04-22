import { useQuery } from '@tanstack/react-query'
import {
  getReceivables,
  searchReceivableLedgers,
  type ReceivableListQueryParams,
  type ReceivableLedgerSearchParams,
} from '../services/receivables-query-service'
import { receivableQueryKeys } from '../query-keys'

export function useGetReceivables(params: ReceivableListQueryParams = {}) {
  const sourceType = params.sourceType?.trim() ?? ''
  const sourceRefId = params.sourceRefId?.trim() ?? ''

  return useQuery({
    queryKey: receivableQueryKeys.receivableList(sourceType, sourceRefId),
    queryFn: () => getReceivables({ sourceType, sourceRefId }),
  })
}

export function useSearchReceivableLedgers(params: ReceivableLedgerSearchParams) {
  const { keyword, status, currency, outstandingMin, outstandingMax, sortBy, sortOrder } = params

  return useQuery({
    queryKey: receivableQueryKeys.receivableSearch(
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

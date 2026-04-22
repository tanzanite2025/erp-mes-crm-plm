import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { QuoteListFilters } from '@/features/quotes/data/quote-summary'
import { listQuoteSummaries } from '@/features/quotes/services/quote-list-service'
import { quoteQueryKeys } from '@/features/quotes/query-keys'

export function useQuoteList(filters: QuoteListFilters) {
  const query = useQuery({
    queryKey: quoteQueryKeys.list(filters),
    queryFn: () => listQuoteSummaries(filters),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows])
  const source = query.data?.source ?? 'api'

  const summary = useMemo(
    () => ({
      total: rows.length,
      amountLabel: rows.length > 0 ? `${rows.length} 条报价结果` : '暂无匹配报价',
    }),
    [rows]
  )

  return {
    rows,
    source,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    summary,
  }
}

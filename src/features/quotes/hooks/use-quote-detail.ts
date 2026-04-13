import { useQuery } from '@tanstack/react-query'
import { getQuoteDetail } from '@/features/quotes/services/quote-detail-service'

export function useQuoteDetail(id: string | null) {
  const query = useQuery({
    queryKey: ['quotes', 'detail', id],
    queryFn: () => getQuoteDetail(id!),
    enabled: Boolean(id),
  })

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  }
}

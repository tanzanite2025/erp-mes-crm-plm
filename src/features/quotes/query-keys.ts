import type { QueryKey } from '@tanstack/react-query'
import type { QuoteListFilters } from '@/features/quotes/data/quote-summary'

export const quoteQueryKeys = {
  all: (): QueryKey => ['quotes'],
  list: (filters: QuoteListFilters): QueryKey => ['quotes', 'list', filters],
  detail: (id: string): QueryKey => ['quotes', 'detail', id],
}

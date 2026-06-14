import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { toQuoteSummaryContracts } from '@/features/quotes/adapters/quote-api-adapter'
import type {
  QuoteListItemApiDTO,
  QuoteListPageApiDTO,
} from '@/features/quotes/contracts/quote-api-dto'
import type {
  QuoteListFilters,
  QuoteSummary,
} from '@/features/quotes/data/quote-summary'

export type QuoteListSource = 'api'

export type QuoteListResult = {
  rows: QuoteSummary[]
  source: QuoteListSource
}

function matchesKeyword(quote: QuoteSummary, keyword: string) {
  if (!keyword) return true

  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true

  return [
    quote.id,
    quote.customerName,
    quote.productSummary,
    quote.ownerName,
    quote.amountLabel,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedKeyword)
}

function filterQuoteSummaries(
  rows: QuoteSummary[],
  filters: QuoteListFilters
): QuoteSummary[] {
  return rows.filter((quote) => {
    if (
      filters.customer !== 'all' &&
      quote.customerSegment !== filters.customer
    ) {
      return false
    }

    if (filters.status !== 'all' && quote.status !== filters.status) {
      return false
    }

    if (filters.quoteType !== 'all' && quote.quoteType !== filters.quoteType) {
      return false
    }

    if (!matchesKeyword(quote, filters.keyword)) {
      return false
    }

    return true
  })
}

function buildQuoteListQuery(filters: QuoteListFilters): string {
  const query = new URLSearchParams()

  if (filters.customer !== 'all') query.set('customerSegment', filters.customer)
  if (filters.status !== 'all') query.set('status', filters.status)
  if (filters.quoteType !== 'all') query.set('type', filters.quoteType)
  if (filters.keyword.trim()) query.set('q', filters.keyword.trim())

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

function toQuoteSummaryArrayFromResponse(
  value: unknown,
  context: string
): QuoteSummary[] {
  const response = ensureObjectResponse<
    QuoteListPageApiDTO & Record<string, unknown>
  >(value, context)
  const items = ensureArrayField<QuoteListItemApiDTO>(
    response,
    'items',
    context
  )
  return toQuoteSummaryContracts(items)
}

async function fetchQuoteSummariesFromApi(
  filters: QuoteListFilters
): Promise<QuoteSummary[]> {
  const suffix = buildQuoteListQuery(filters)
  const response = await apiFetch<unknown>(`/quotes${suffix}`)
  return toQuoteSummaryArrayFromResponse(response, 'QuoteListService./quotes')
}

export async function listQuoteSummaries(
  filters: QuoteListFilters
): Promise<QuoteListResult> {
  const apiRows = await fetchQuoteSummariesFromApi(filters)

  return {
    rows: filterQuoteSummaries(apiRows, filters),
    source: 'api',
  }
}

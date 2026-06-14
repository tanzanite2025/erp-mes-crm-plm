import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { toQuoteDetailContract } from '@/features/quotes/adapters/quote-api-adapter'
import type { QuoteDetailApiDTO } from '@/features/quotes/contracts/quote-detail-api-dto'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

export async function getQuoteDetail(id: string): Promise<QuoteDetail> {
  const response = await apiFetch<QuoteDetailApiDTO>(`/quotes/${id}`)
  return toQuoteDetailContract(
    ensureObjectResponse<QuoteDetailApiDTO & Record<string, unknown>>(
      response,
      'QuoteDetailService.getQuoteDetail'
    )
  )
}

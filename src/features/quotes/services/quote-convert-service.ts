import { apiFetch } from '@/lib/api-client'

export type QuoteConvertResponse = {
  quoteId: string
  targetSalesOrderId: string
  targetSalesOrderNo: string
  status: string
}

export async function convertQuote(id: string): Promise<QuoteConvertResponse> {
  return apiFetch<QuoteConvertResponse>(`/quotes/${id}/convert`, {
    method: 'POST',
  })
}

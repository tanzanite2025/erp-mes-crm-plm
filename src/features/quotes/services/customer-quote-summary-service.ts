import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import type {
  CustomerQuoteSummaryItemApiDTO,
  CustomerQuoteSummaryResponseApiDTO,
} from '@/features/quotes/contracts/customer-quote-summary-api-dto'

export type CustomerQuoteSummaryItem = {
  id: string
  quoteNo: string
  status: string
  updatedAt: string
  customerId: string
}

export async function listCustomerQuoteSummary(
  customerId: string
): Promise<CustomerQuoteSummaryItem[]> {
  const response = await apiFetch<unknown>(
    `/quotes/customer-summary?customerId=${encodeURIComponent(customerId)}`
  )
  const payload = ensureObjectResponse<
    CustomerQuoteSummaryResponseApiDTO & Record<string, unknown>
  >(response, 'CustomerQuoteSummaryService./quotes/customer-summary')
  const items = ensureArrayField<CustomerQuoteSummaryItemApiDTO>(
    payload,
    'items',
    'CustomerQuoteSummaryService.items'
  )

  return items.map((item) => ({
    id: item.quoteId?.trim() || item.quoteNo?.trim() || '',
    quoteNo: item.quoteNo?.trim() || item.quoteId?.trim() || 'UNKNOWN',
    status: item.status?.trim() || 'draft',
    updatedAt: item.updatedAt?.trim() || '未知时间',
    customerId: item.customerId?.trim() || customerId,
  }))
}

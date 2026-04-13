import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'

export interface CustomerSalesClosureSummary {
  customerId: string
  hasOpenOrders: boolean
  openOrderCount: number
  lastOrderDate: string
  daysSinceLastOrder?: number
  totalOrders: number
}

export interface CustomerSalesClosureSummaryListResponse {
  items: CustomerSalesClosureSummary[]
  total: number
}

function parseSummaryItem(value: unknown, context: string): CustomerSalesClosureSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected summary item to be an object.`)
  }

  const record = value as Record<string, unknown>

  return {
    customerId: typeof record.customerId === 'string' ? record.customerId : '',
    hasOpenOrders: typeof record.hasOpenOrders === 'boolean' ? record.hasOpenOrders : false,
    openOrderCount: typeof record.openOrderCount === 'number' ? record.openOrderCount : 0,
    lastOrderDate: typeof record.lastOrderDate === 'string' ? record.lastOrderDate : '',
    daysSinceLastOrder: typeof record.daysSinceLastOrder === 'number' ? record.daysSinceLastOrder : undefined,
    totalOrders: typeof record.totalOrders === 'number' ? record.totalOrders : 0,
  }
}

export async function getCustomerSalesClosureSummaryList(): Promise<CustomerSalesClosureSummaryListResponse> {
  const context = 'CustomerSalesClosureSummaryService.getCustomerSalesClosureSummaryList'
  const res = await apiFetch<Record<string, unknown>>('/customers/sales-closure-summary')
  const objectResponse = ensureObjectResponse<Record<string, unknown>>(res, context)
  const items = ensureArrayField<unknown>(objectResponse, 'items', context).map((item) => parseSummaryItem(item, context))
  const total = typeof objectResponse.total === 'number' ? objectResponse.total : items.length

  return {
    items,
    total,
  }
}

import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureNumberField, ensureObjectField, ensureObjectResponse } from '@/lib/api-response'

export interface CustomerSalesClosureSummary {
  customerId: string
  hasOpenOrders: boolean
  openOrderCount: number
  lastOrderDate: string
  daysSinceLastOrder?: number
  totalOrders: number
}

export interface CustomerSalesClosureSummaryMetadata {
  pagination: {
    total: number
    page: number
    pageSize: number
  }
  stats: {
    total: number
    active: number
    newThisMonth: number
  }
}

export interface CustomerSalesClosureSummaryListResponse {
  items: CustomerSalesClosureSummary[]
  total: number
  metadata: CustomerSalesClosureSummaryMetadata
}

function parseSummaryItem(value: unknown, context: string): CustomerSalesClosureSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected summary item to be an object.`)
  }

  const record = value as Record<string, unknown>

  const customerId = record.customerId
  const hasOpenOrders = record.hasOpenOrders
  const openOrderCount = record.openOrderCount
  const lastOrderDate = record.lastOrderDate
  const totalOrders = record.totalOrders

  if (typeof customerId !== 'string' || customerId.trim() === '') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected customerId to be a non-empty string.`)
  }
  if (typeof hasOpenOrders !== 'boolean') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected hasOpenOrders to be a boolean.`)
  }
  if (typeof openOrderCount !== 'number') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected openOrderCount to be a number.`)
  }
  if (typeof lastOrderDate !== 'string') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected lastOrderDate to be a string.`)
  }
  if (typeof totalOrders !== 'number') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected totalOrders to be a number.`)
  }

  const daysSinceLastOrder = record.daysSinceLastOrder
  if (daysSinceLastOrder !== undefined && typeof daysSinceLastOrder !== 'number') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected daysSinceLastOrder to be a number when present.`)
  }

  return {
    customerId,
    hasOpenOrders,
    openOrderCount,
    lastOrderDate,
    daysSinceLastOrder,
    totalOrders,
  }
}

export async function getCustomerSalesClosureSummaryList(): Promise<CustomerSalesClosureSummaryListResponse> {
  const context = 'CustomerSalesClosureSummaryService.getCustomerSalesClosureSummaryList'
  const res = await apiFetch<Record<string, unknown>>('/customers/sales-closure-summary')
  const objectResponse = ensureObjectResponse<Record<string, unknown>>(res, context)
  const items = ensureArrayField<unknown>(objectResponse, 'items', context).map((item) => parseSummaryItem(item, context))
  const total = ensureNumberField(objectResponse, 'total', context)
  const metadata = ensureObjectField<Record<string, unknown>>(objectResponse, 'metadata', context)

  const pagination = ensureObjectField<Record<string, unknown>>(metadata, 'pagination', context)
  const stats = ensureObjectField<Record<string, unknown>>(metadata, 'stats', context)

  return {
    items,
    total,
    metadata: {
      pagination: {
        total: ensureNumberField(pagination, 'total', context),
        page: ensureNumberField(pagination, 'page', context),
        pageSize: ensureNumberField(pagination, 'pageSize', context),
      },
      stats: {
        total: ensureNumberField(stats, 'total', context),
        active: ensureNumberField(stats, 'active', context),
        newThisMonth: ensureNumberField(stats, 'newThisMonth', context),
      },
    },
  }
}

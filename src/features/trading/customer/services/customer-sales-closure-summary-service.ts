import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'

export interface CustomerSalesStatusCount {
  code: string
  phase: string
  count: number
}

export interface CustomerSalesClosureSummary {
  customerId: string
  canceledOrderCount: number
  effectiveOrderCount: number
  primaryStatusCode: string
  primaryStatusPhase: string
  statusCounts: CustomerSalesStatusCount[]
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

function parseStatusCount(
  value: unknown,
  context: string
): CustomerSalesStatusCount {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected statusCounts item to be an object.`
    )
  }

  const record = value as Record<string, unknown>
  const code = record.code
  const phase = record.phase
  const count = record.count

  if (typeof code !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected statusCounts.code to be a string.`
    )
  }
  if (typeof phase !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected statusCounts.phase to be a string.`
    )
  }
  if (typeof count !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected statusCounts.count to be a number.`
    )
  }

  return {
    code,
    phase,
    count,
  }
}

function parseSummaryItem(
  value: unknown,
  context: string
): CustomerSalesClosureSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected summary item to be an object.`
    )
  }

  const record = value as Record<string, unknown>

  const customerId = record.customerId
  const canceledOrderCount = record.canceledOrderCount
  const effectiveOrderCount = record.effectiveOrderCount
  const primaryStatusCode = record.primaryStatusCode
  const primaryStatusPhase = record.primaryStatusPhase
  const statusCounts = ensureArrayField<unknown>(
    record,
    'statusCounts',
    context
  ).map((item) => parseStatusCount(item, context))
  const lastOrderDate = record.lastOrderDate
  const totalOrders = record.totalOrders

  if (typeof customerId !== 'string' || customerId.trim() === '') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected customerId to be a non-empty string.`
    )
  }
  if (typeof canceledOrderCount !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected canceledOrderCount to be a number.`
    )
  }
  if (typeof effectiveOrderCount !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected effectiveOrderCount to be a number.`
    )
  }
  if (typeof primaryStatusCode !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected primaryStatusCode to be a string.`
    )
  }
  if (typeof primaryStatusPhase !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected primaryStatusPhase to be a string.`
    )
  }
  if (typeof lastOrderDate !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected lastOrderDate to be a string.`
    )
  }
  if (typeof totalOrders !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected totalOrders to be a number.`
    )
  }

  const daysSinceLastOrder = record.daysSinceLastOrder
  if (
    daysSinceLastOrder !== undefined &&
    typeof daysSinceLastOrder !== 'number'
  ) {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected daysSinceLastOrder to be a number when present.`
    )
  }

  return {
    customerId,
    canceledOrderCount,
    effectiveOrderCount,
    primaryStatusCode,
    primaryStatusPhase,
    statusCounts,
    lastOrderDate,
    daysSinceLastOrder,
    totalOrders,
  }
}

export async function getCustomerSalesClosureSummaryList(): Promise<CustomerSalesClosureSummaryListResponse> {
  const context =
    'CustomerSalesClosureSummaryService.getCustomerSalesClosureSummaryList'
  const res = await apiFetch<Record<string, unknown>>(
    '/customers/sales-closure-summary'
  )
  const objectResponse = ensureObjectResponse<Record<string, unknown>>(
    res,
    context
  )
  const items = ensureArrayField<unknown>(objectResponse, 'items', context).map(
    (item) => parseSummaryItem(item, context)
  )
  const total = ensureNumberField(objectResponse, 'total', context)
  const metadata = ensureObjectField<Record<string, unknown>>(
    objectResponse,
    'metadata',
    context
  )

  const pagination = ensureObjectField<Record<string, unknown>>(
    metadata,
    'pagination',
    context
  )
  const stats = ensureObjectField<Record<string, unknown>>(
    metadata,
    'stats',
    context
  )

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

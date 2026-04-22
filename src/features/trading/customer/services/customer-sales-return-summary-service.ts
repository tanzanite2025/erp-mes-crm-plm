import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectResponse,
} from '@/lib/api-response'

export interface CustomerSalesReturnSummary {
  customerId: string
  returnedQuantity: number
  returnedOrderCount: number
  lastReturnDate: string
  totalOrders: number
}

export interface CustomerSalesReturnSummaryListResponse {
  items: CustomerSalesReturnSummary[]
  total: number
}

function parseSummaryItem(
  value: unknown,
  context: string
): CustomerSalesReturnSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected summary item to be an object.`
    )
  }

  const record = value as Record<string, unknown>
  const customerId = record.customerId
  const returnedQuantity = record.returnedQuantity
  const returnedOrderCount = record.returnedOrderCount
  const lastReturnDate = record.lastReturnDate
  const totalOrders = record.totalOrders

  if (typeof customerId !== 'string' || customerId.trim() === '') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected customerId to be a non-empty string.`
    )
  }
  if (typeof returnedQuantity !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected returnedQuantity to be a number.`
    )
  }
  if (typeof returnedOrderCount !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected returnedOrderCount to be a number.`
    )
  }
  if (typeof lastReturnDate !== 'string') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected lastReturnDate to be a string.`
    )
  }
  if (typeof totalOrders !== 'number') {
    throw new Error(
      `[INVALID_RESPONSE] ${context} expected totalOrders to be a number.`
    )
  }

  return {
    customerId,
    returnedQuantity,
    returnedOrderCount,
    lastReturnDate,
    totalOrders,
  }
}

export async function getCustomerSalesReturnSummaryList(): Promise<CustomerSalesReturnSummaryListResponse> {
  const context =
    'CustomerSalesReturnSummaryService.getCustomerSalesReturnSummaryList'
  const res = await apiFetch<Record<string, unknown>>(
    '/customers/sales-return-summary'
  )
  const objectResponse = ensureObjectResponse<Record<string, unknown>>(
    res,
    context
  )

  return {
    items: ensureArrayField<unknown>(objectResponse, 'items', context).map(
      (item) => parseSummaryItem(item, context)
    ),
    total: ensureNumberField(objectResponse, 'total', context),
  }
}

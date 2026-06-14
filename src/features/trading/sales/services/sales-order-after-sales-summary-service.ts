import { apiFetch } from '@/lib/api-client'
import { ensureArrayField } from '@/lib/api-response'

export interface SalesOrderAfterSalesReturnSummary {
  count: number
  totalQuantity: number
  totalAmount: number
  pendingTrackingCount: number
  openCount: number
  latestReturnNo: string
  latestStatus: string
}

export interface SalesOrderAfterSalesExchangeSummary {
  count: number
  totalQuantity: number
  openCount: number
  oldItemPendingCount: number
  replacementPendingCount: number
  latestExchangeNo: string
  latestStatus: string
}

export interface SalesOrderAfterSalesSummary {
  salesOrderId: string
  returns: SalesOrderAfterSalesReturnSummary
  exchanges: SalesOrderAfterSalesExchangeSummary
}

interface SalesOrderAfterSalesSummaryResponse {
  items: SalesOrderAfterSalesSummary[]
}

export async function getSalesOrderAfterSalesSummaries(
  salesOrderIds: readonly string[]
): Promise<SalesOrderAfterSalesSummary[]> {
  const response = await apiFetch<SalesOrderAfterSalesSummaryResponse>(
    '/sales-orders/after-sales-summary',
    {
      method: 'POST',
      body: JSON.stringify({ salesOrderIds }),
    }
  )

  return ensureArrayField<SalesOrderAfterSalesSummary>(
    response,
    'items',
    'SalesOrderAfterSalesSummaryService.getSalesOrderAfterSalesSummaries'
  )
}

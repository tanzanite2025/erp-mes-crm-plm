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

export interface SalesOrderAfterSalesReturnReference {
  id: string
  returnNo: string
  status: string
  requestedQuantity: number
  receivedQuantity: number
  trackingNo: string
}

export interface SalesOrderAfterSalesExchangeReference {
  id: string
  exchangeNo: string
  status: string
  requestedQuantity: number
  oldItemReceivedQuantity: number
  replacementShippedQuantity: number
  replacementProductCode: string
  oldItemTrackingNo: string
  replacementTrackingNo: string
}

export interface SalesOrderAfterSalesLineSummary {
  salesOrderLineId: number
  lineNo: number
  productCode: string
  deliveredQuantity: number
  returnRequestedQuantity: number
  returnReceivedQuantity: number
  exchangeRequestedQuantity: number
  oldItemReceivedQuantity: number
  replacementShippedQuantity: number
  latestReturnStatus: string
  latestExchangeStatus: string
  relatedReturns: SalesOrderAfterSalesReturnReference[]
  relatedExchanges: SalesOrderAfterSalesExchangeReference[]
}

export interface SalesOrderAfterSalesSummary {
  salesOrderId: string
  returns: SalesOrderAfterSalesReturnSummary
  exchanges: SalesOrderAfterSalesExchangeSummary
  lines: SalesOrderAfterSalesLineSummary[]
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

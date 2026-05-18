import type { SalesOrder } from '../data/schema'
import type {
  SalesOrderAfterSalesExchangeSummary,
  SalesOrderAfterSalesReturnSummary,
  SalesOrderAfterSalesSummary,
} from '../sales/services/sales-order-after-sales-summary-service'

export type SalesOrderAfterSalesCardState = 'empty' | 'healthy' | 'alert' | 'critical'

export interface SalesOrderAfterSalesCardViewModel {
  salesOrderId: string
  state: SalesOrderAfterSalesCardState
  isLoading: boolean
  isError: boolean
  error: Error | null
  summariesReady: boolean
  returns: SalesOrderAfterSalesReturnSummary
  exchanges: SalesOrderAfterSalesExchangeSummary
  totalCount: number
  openCount: number
  hasAfterSales: boolean
}

interface BuildSalesOrderAfterSalesCardViewModelInput {
  order: SalesOrder
  summary?: SalesOrderAfterSalesSummary
  summariesReady: boolean
  isLoading: boolean
  isError: boolean
  error: Error | null
}

const emptyReturnSummary: SalesOrderAfterSalesReturnSummary = {
  count: 0,
  totalQuantity: 0,
  totalAmount: 0,
  pendingTrackingCount: 0,
  openCount: 0,
  latestReturnNo: '',
  latestStatus: '',
}

const emptyExchangeSummary: SalesOrderAfterSalesExchangeSummary = {
  count: 0,
  totalQuantity: 0,
  openCount: 0,
  oldItemPendingCount: 0,
  replacementPendingCount: 0,
  latestExchangeNo: '',
  latestStatus: '',
}

function deriveSalesOrderAfterSalesCardState(
  returns: SalesOrderAfterSalesReturnSummary,
  exchanges: SalesOrderAfterSalesExchangeSummary
): SalesOrderAfterSalesCardState {
  const totalCount = returns.count + exchanges.count
  if (totalCount === 0) {
    return 'empty'
  }

  if (returns.pendingTrackingCount > 0 || exchanges.oldItemPendingCount > 0) {
    return 'critical'
  }

  if (
    returns.openCount > 0 ||
    exchanges.openCount > 0 ||
    exchanges.replacementPendingCount > 0
  ) {
    return 'alert'
  }

  return 'healthy'
}

export function buildSalesOrderAfterSalesCardViewModel({
  order,
  summary,
  summariesReady,
  isLoading,
  isError,
  error,
}: BuildSalesOrderAfterSalesCardViewModelInput): SalesOrderAfterSalesCardViewModel {
  const returns = summary?.returns ?? emptyReturnSummary
  const exchanges = summary?.exchanges ?? emptyExchangeSummary
  const totalCount = returns.count + exchanges.count
  const openCount = returns.openCount + exchanges.openCount

  return {
    salesOrderId: order.id,
    state: deriveSalesOrderAfterSalesCardState(returns, exchanges),
    isLoading,
    isError,
    error,
    summariesReady,
    returns,
    exchanges,
    totalCount,
    openCount,
    hasAfterSales: totalCount > 0,
  }
}
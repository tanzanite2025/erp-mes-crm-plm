import {
  getSalesOrderById,
  getSalesOrders,
  type GetSalesOrdersOptions,
} from './sales-query-service'

export type GetSalesReturnSourceOrdersOptions = {
  page?: number
  pageSize?: number
  status?: string
  customerId?: string
  keyword?: string
}

const SALES_RETURN_SOURCE_ORDER_STATUSES = ['InProgress', 'Done'] as const
const salesReturnSourceOrderStatusSet = new Set<string>(
  SALES_RETURN_SOURCE_ORDER_STATUSES
)

function resolveSalesReturnSourceStatuses(status?: string): string[] {
  if (
    status &&
    status !== 'all' &&
    salesReturnSourceOrderStatusSet.has(status)
  ) {
    return [status]
  }

  return [...SALES_RETURN_SOURCE_ORDER_STATUSES]
}

export async function getSalesReturnSourceOrders(
  options: GetSalesReturnSourceOrdersOptions = {}
) {
  const { page = 1, pageSize = 50, status, customerId, keyword } = options
  const queryOptions: GetSalesOrdersOptions = {
    page,
    pageSize,
    withLines: true,
    status: resolveSalesReturnSourceStatuses(status),
    customerId,
    keyword,
  }

  return getSalesOrders(queryOptions)
}

export async function getSalesReturnSourceOrderDetail(id: string) {
  return getSalesOrderById(id)
}

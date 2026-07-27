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

const NON_CANCELED_SALES_ORDER_STATUSES = [
  'Draft',
  'Pending',
  'Scheduling',
  'InProgress',
  'Done',
]

function resolveSalesReturnSourceStatuses(status?: string): string[] {
  if (status && status !== 'all' && status !== 'Canceled') {
    return [status]
  }

  return NON_CANCELED_SALES_ORDER_STATUSES
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

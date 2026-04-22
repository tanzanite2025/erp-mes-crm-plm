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

export async function getSalesReturnSourceOrders(
  options: GetSalesReturnSourceOrdersOptions = {}
) {
  const { page = 1, pageSize = 50, status, customerId, keyword } = options
  const queryOptions: GetSalesOrdersOptions = {
    page,
    pageSize,
    withLines: true,
    status: status && status !== 'all' ? [status] : undefined,
    customerId,
    keyword,
  }

  return getSalesOrders(queryOptions)
}

export async function getSalesReturnSourceOrderDetail(id: string) {
  return getSalesOrderById(id)
}

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { toSalesOrderContract, toSalesOrderListPageContract, type PaginatedSalesOrders } from '../adapters/sales-order-api-adapter'
import { type SalesOrderApiDTO, type SalesOrderListPageApiDTO } from '../contracts/sales-order-api-dto'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type GetSalesOrdersOptions = {
  page?: number
  pageSize?: number
  withLines?: boolean
  status?: string[]
}

export const getSalesOrders = async (
  options: GetSalesOrdersOptions = {}
): Promise<PaginatedSalesOrders> => {
  const { page = 1, pageSize = 50, withLines = false, status } = options

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  if (withLines) {
    params.set('withLines', 'true')
  }
  if (status && status.length > 0) {
    params.set('status', status.join(','))
  }

  const res = await apiFetch<SalesOrderListPageApiDTO>(`/sales-orders?${params.toString()}`)
  const response = ensureObjectResponse<SalesOrderListPageApiDTO & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrders'
  )
  return toSalesOrderListPageContract(response)
}

export const getSalesOrderById = async (id: string) => {
  const res = await apiFetch<SalesOrderApiDTO>(`/sales-orders/${id}`)
  const response = ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrderById'
  )
  return toSalesOrderContract(response)
}

export const getSalesOrderByNo = async (orderNo: string) => {
  const res = await apiFetch<SalesOrderApiDTO>(`/sales-orders/by-no/${orderNo}`)
  const response = ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrderByNo'
  )
  return toSalesOrderContract(response)
}

export const getCustomerProductStats = async (params: { customerId?: string } = {}): Promise<Record<string, unknown>> => {
  const query = params.customerId ? `?customerId=${params.customerId}` : ''
  const res = await apiFetch<Record<string, unknown>>(`/sales-orders/analytics/customer-product-stats${query}`)
  return ensureObjectResponse<Record<string, unknown> & Record<string, unknown>>(res, 'SalesQueryService.getCustomerProductStats')
}

export const getGlobalProductRanking = async (limit: number = 10): Promise<Record<string, unknown>> => {
  const res = await apiFetch<Record<string, unknown>>(`/sales-orders/analytics/global-product-ranking?limit=${limit}`)
  return ensureObjectResponse<Record<string, unknown> & Record<string, unknown>>(res, 'SalesQueryService.getGlobalProductRanking')
}

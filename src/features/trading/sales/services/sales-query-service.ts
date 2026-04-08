import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type SalesOrder } from '../../data/schema'

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
): Promise<PaginatedResponse<SalesOrder>> => {
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

  const res = await apiFetch<PaginatedResponse<SalesOrder>>(`/sales-orders?${params.toString()}`)
  return ensureObjectResponse<PaginatedResponse<SalesOrder> & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrders'
  ) as PaginatedResponse<SalesOrder>
}

export const getSalesOrderById = async (id: string): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>(`/sales-orders/${id}`)
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrderById'
  ) as SalesOrder
}

export const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>(`/sales-orders/by-no/${orderNo}`)
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(
    res,
    'SalesQueryService.getSalesOrderByNo'
  ) as SalesOrder
}

/**
 * [BACKEND-AGGREGATION] 获取客户产品统计数据
 */
export const getCustomerProductStats = async (params: { customerId?: string } = {}): Promise<any> => {
  const query = params.customerId ? `?customerId=${params.customerId}` : ''
  const res = await apiFetch(`/sales-orders/analytics/customer-product-stats${query}`)
  return ensureObjectResponse(res, 'SalesQueryService.getCustomerProductStats')
}

/**
 * [BACKEND-AGGREGATION] 获取全局产品排行榜
 */
export const getGlobalProductRanking = async (limit: number = 10): Promise<any> => {
  const res = await apiFetch(`/sales-orders/analytics/global-product-ranking?limit=${limit}`)
  return ensureObjectResponse(res, 'SalesQueryService.getGlobalProductRanking')
}

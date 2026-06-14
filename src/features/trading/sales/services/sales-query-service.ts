import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import {
  TRADING_QUERY_PARAM_PAGE,
  TRADING_QUERY_PARAM_PAGE_SIZE,
  TRADING_QUERY_PARAM_KEYWORD,
  TRADING_QUERY_PARAM_PAYMENT_METHOD,
  TRADING_QUERY_PARAM_PAYMENT_TERM,
  TRADING_QUERY_PARAM_STATUS,
  TRADING_QUERY_PARAM_WITH_LINES,
} from '../../query-params'
import {
  toCustomerAnalyticsArrayContract,
  toProductStatArrayContract,
  type CustomerAnalytics,
  type ProductStat,
} from '../adapters/sales-analytics-api-adapter'
import {
  toSalesOrderContract,
  toSalesOrderListPageContract,
  type PaginatedSalesOrders,
} from '../adapters/sales-order-api-adapter'
import {
  deserializeCustomerAnalyticsListResponseApiDTO,
  deserializeGlobalProductRankingResponseApiDTO,
} from '../contracts/sales-analytics-api-dto'
import {
  deserializeSalesOrderApiDTO,
  deserializeSalesOrderListPageApiDTO,
  type SalesOrderApiDTO,
  type SalesOrderListPageApiDTO,
} from '../contracts/sales-order-api-dto'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

const logger = createLogger('SalesQueryService')

function logSalesOrdersPayload(payload: unknown, context: string) {
  if (!payload || typeof payload !== 'object') {
    logger.error(`${context} returned a non-object payload`, {
      payloadType: typeof payload,
      payload,
    })
    return
  }

  const record = payload as Record<string, unknown>
  logger.debug(`${context} payload received`, {
    keys: Object.keys(record),
    isArray: Array.isArray(payload),
    total: record.total,
    page: record.page,
    pageSize: record.pageSize,
    itemsType: Array.isArray(record.items) ? 'array' : typeof record.items,
  })
}

export type GetSalesOrdersOptions = {
  page?: number
  pageSize?: number
  withLines?: boolean
  status?: string[]
  customerId?: string
  keyword?: string
  paymentMethod?: string
  paymentTerm?: string
}

export const getSalesOrders = async (
  options: GetSalesOrdersOptions = {}
): Promise<PaginatedSalesOrders> => {
  const {
    page = 1,
    pageSize = 50,
    withLines = false,
    status,
    customerId,
    keyword,
    paymentMethod,
    paymentTerm,
  } = options

  const params = new URLSearchParams({
    [TRADING_QUERY_PARAM_PAGE]: String(page),
    [TRADING_QUERY_PARAM_PAGE_SIZE]: String(pageSize),
  })

  logger.debug('SalesQueryService.getSalesOrders request prepared', {
    endpoint: `/sales-orders?${params.toString()}`,
    page,
    pageSize,
    withLines,
    status,
  })

  if (withLines) {
    params.set(TRADING_QUERY_PARAM_WITH_LINES, 'true')
  }
  if (status && status.length > 0) {
    params.set(TRADING_QUERY_PARAM_STATUS, status.join(','))
  }
  if (customerId && customerId.trim().length > 0) {
    params.set('customerId', customerId.trim())
  }
  if (keyword && keyword.trim().length > 0) {
    params.set(TRADING_QUERY_PARAM_KEYWORD, keyword.trim())
  }
  if (paymentMethod && paymentMethod.trim().length > 0) {
    params.set(TRADING_QUERY_PARAM_PAYMENT_METHOD, paymentMethod.trim())
  }
  if (paymentTerm && paymentTerm.trim().length > 0) {
    params.set(TRADING_QUERY_PARAM_PAYMENT_TERM, paymentTerm.trim())
  }

  const res = await apiFetch<unknown>(`/sales-orders?${params.toString()}`)
  logger.debug('SalesQueryService.getSalesOrders apiFetch resolved', {
    endpoint: `/sales-orders?${params.toString()}`,
  })
  logSalesOrdersPayload(res, 'SalesQueryService.getSalesOrders raw response')

  const response = ensureObjectResponse<
    SalesOrderListPageApiDTO & Record<string, unknown>
  >(res, 'SalesQueryService.getSalesOrders')

  logger.debug('SalesQueryService.getSalesOrders contract fields', {
    hasItems: Array.isArray(response.items),
    totalType: typeof response.total,
    pageType: typeof response.page,
    pageSizeType: typeof response.pageSize,
    itemsLength: Array.isArray(response.items) ? response.items.length : null,
    firstItemKeys:
      Array.isArray(response.items) && response.items.length > 0
        ? Object.keys(response.items[0] as Record<string, unknown>)
        : [],
  })

  return toSalesOrderListPageContract(
    deserializeSalesOrderListPageApiDTO(response, { withLines }),
    { withLines }
  )
}

export const getSalesOrderById = async (id: string) => {
  const res = await apiFetch<unknown>(`/sales-orders/${id}`)
  const response = ensureObjectResponse<
    SalesOrderApiDTO & Record<string, unknown>
  >(res, 'SalesQueryService.getSalesOrderById')
  logger.debug('SalesQueryService.getSalesOrderById contract fields', {
    hasLines: Array.isArray(response.lines),
    statusType: typeof response.status,
    versionType: typeof response.version,
  })
  return toSalesOrderContract(deserializeSalesOrderApiDTO(response))
}

export const getSalesOrderByNo = async (orderNo: string) => {
  const res = await apiFetch<unknown>(`/sales-orders/by-no/${orderNo}`)
  const response = ensureObjectResponse<
    SalesOrderApiDTO & Record<string, unknown>
  >(res, 'SalesQueryService.getSalesOrderByNo')
  return toSalesOrderContract(deserializeSalesOrderApiDTO(response))
}

export const getCustomerProductStats = async (
  params: { customerId?: string } = {}
): Promise<CustomerAnalytics[]> => {
  const query = params.customerId ? `?customerId=${params.customerId}` : ''
  const res = await apiFetch<unknown>(
    `/sales-orders/analytics/customer-product-stats${query}`
  )
  const response = ensureObjectResponse<Record<string, unknown>>(
    res,
    'SalesQueryService.getCustomerProductStats'
  )
  const dto = deserializeCustomerAnalyticsListResponseApiDTO(response)
  return toCustomerAnalyticsArrayContract(dto.items)
}

export const getGlobalProductRanking = async (
  limit: number = 10
): Promise<ProductStat[]> => {
  const res = await apiFetch<unknown>(
    `/sales-orders/analytics/global-product-ranking?limit=${limit}`
  )
  const response = ensureObjectResponse<Record<string, unknown>>(
    res,
    'SalesQueryService.getGlobalProductRanking'
  )
  const dto = deserializeGlobalProductRankingResponseApiDTO(response)
  return toProductStatArrayContract(dto.items)
}

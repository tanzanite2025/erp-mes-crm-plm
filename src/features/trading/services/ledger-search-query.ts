import {
  TRADING_QUERY_PARAM_CURRENCY,
  TRADING_QUERY_PARAM_KEYWORD,
  TRADING_QUERY_PARAM_OUTSTANDING_MAX,
  TRADING_QUERY_PARAM_OUTSTANDING_MIN,
  TRADING_QUERY_PARAM_PAGE,
  TRADING_QUERY_PARAM_PAGE_SIZE,
  TRADING_QUERY_PARAM_SORT_BY,
  TRADING_QUERY_PARAM_SORT_ORDER,
  TRADING_QUERY_PARAM_STATUS,
} from '../query-params'

export interface LedgerSearchQueryParams {
  keyword: string
  status: string
  currency: string
  outstandingMin: string
  outstandingMax: string
  sortBy: string
  sortOrder: string
}

export interface LedgerSearchPaginationParams {
  page?: string
  pageSize?: string
}

export function buildLedgerSearchQuery(
  params: LedgerSearchQueryParams,
  pagination: LedgerSearchPaginationParams = {}
): URLSearchParams {
  return new URLSearchParams({
    [TRADING_QUERY_PARAM_KEYWORD]: params.keyword,
    [TRADING_QUERY_PARAM_PAGE]: pagination.page ?? '1',
    [TRADING_QUERY_PARAM_PAGE_SIZE]: pagination.pageSize ?? '20',
    [TRADING_QUERY_PARAM_STATUS]: params.status,
    [TRADING_QUERY_PARAM_CURRENCY]: params.currency,
    [TRADING_QUERY_PARAM_OUTSTANDING_MIN]: params.outstandingMin,
    [TRADING_QUERY_PARAM_OUTSTANDING_MAX]: params.outstandingMax,
    [TRADING_QUERY_PARAM_SORT_BY]: params.sortBy,
    [TRADING_QUERY_PARAM_SORT_ORDER]: params.sortOrder,
  })
}

export function buildLedgerSearchUrl(
  endpoint: string,
  params: LedgerSearchQueryParams,
  pagination?: LedgerSearchPaginationParams
): string {
  return `${endpoint}?${buildLedgerSearchQuery(params, pagination).toString()}`
}

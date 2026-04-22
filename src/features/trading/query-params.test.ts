import { describe, expect, it } from 'vitest'

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
  TRADING_QUERY_PARAM_WITH_LINES,
} from './query-params'

describe('trading query params', () => {
  it('locks shared trading query key values', () => {
    expect(TRADING_QUERY_PARAM_PAGE).toBe('page')
    expect(TRADING_QUERY_PARAM_PAGE_SIZE).toBe('pageSize')
    expect(TRADING_QUERY_PARAM_WITH_LINES).toBe('withLines')
    expect(TRADING_QUERY_PARAM_STATUS).toBe('status')
    expect(TRADING_QUERY_PARAM_KEYWORD).toBe('keyword')
    expect(TRADING_QUERY_PARAM_CURRENCY).toBe('currency')
    expect(TRADING_QUERY_PARAM_OUTSTANDING_MIN).toBe('outstandingMin')
    expect(TRADING_QUERY_PARAM_OUTSTANDING_MAX).toBe('outstandingMax')
    expect(TRADING_QUERY_PARAM_SORT_BY).toBe('sortBy')
    expect(TRADING_QUERY_PARAM_SORT_ORDER).toBe('sortOrder')
  })
})

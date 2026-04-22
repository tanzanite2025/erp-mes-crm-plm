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
} from '../query-params'
import { buildLedgerSearchQuery, buildLedgerSearchUrl } from './ledger-search-query'

const params = {
  keyword: 'SO-001',
  status: 'Open',
  currency: 'CNY',
  outstandingMin: '10',
  outstandingMax: '100',
  sortBy: 'outstanding_amount',
  sortOrder: 'desc',
}

describe('ledger search query builder', () => {
  it('locks the shared ledger search query shape and default pagination', () => {
    const query = buildLedgerSearchQuery(params)

    expect(query.get(TRADING_QUERY_PARAM_KEYWORD)).toBe('SO-001')
    expect(query.get(TRADING_QUERY_PARAM_PAGE)).toBe('1')
    expect(query.get(TRADING_QUERY_PARAM_PAGE_SIZE)).toBe('20')
    expect(query.get(TRADING_QUERY_PARAM_STATUS)).toBe('Open')
    expect(query.get(TRADING_QUERY_PARAM_CURRENCY)).toBe('CNY')
    expect(query.get(TRADING_QUERY_PARAM_OUTSTANDING_MIN)).toBe('10')
    expect(query.get(TRADING_QUERY_PARAM_OUTSTANDING_MAX)).toBe('100')
    expect(query.get(TRADING_QUERY_PARAM_SORT_BY)).toBe('outstanding_amount')
    expect(query.get(TRADING_QUERY_PARAM_SORT_ORDER)).toBe('desc')
  })

  it('allows callers to override pagination without changing search keys', () => {
    const query = buildLedgerSearchQuery(params, {
      page: '3',
      pageSize: '50',
    })

    expect(query.get(TRADING_QUERY_PARAM_PAGE)).toBe('3')
    expect(query.get(TRADING_QUERY_PARAM_PAGE_SIZE)).toBe('50')
    expect(query.get(TRADING_QUERY_PARAM_KEYWORD)).toBe('SO-001')
  })

  it('builds endpoint URLs from the same query contract', () => {
    const url = buildLedgerSearchUrl('/receivables/search', params)

    expect(url).toBe(
      '/receivables/search?keyword=SO-001&page=1&pageSize=20&status=Open&currency=CNY&outstandingMin=10&outstandingMax=100&sortBy=outstanding_amount&sortOrder=desc'
    )
  })
})

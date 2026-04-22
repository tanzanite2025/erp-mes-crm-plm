import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

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
} from '../../query-params'
import { getPayables, searchPayableLedgers } from './payables-query-service'

const searchParams = {
  keyword: 'PO-001',
  status: 'Open',
  currency: 'CNY',
  outstandingMin: '',
  outstandingMax: '',
  sortBy: 'dueDate',
  sortOrder: 'asc',
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('PayablesQueryService', () => {
  it('rejects payable list pages that omit summary metadata', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(getPayables()).rejects.toThrow()
  })

  it('sends the locked ledger search query params to the backend', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    await searchPayableLedgers(searchParams)

    const query = new URLSearchParams({
      [TRADING_QUERY_PARAM_KEYWORD]: searchParams.keyword,
      [TRADING_QUERY_PARAM_PAGE]: '1',
      [TRADING_QUERY_PARAM_PAGE_SIZE]: '20',
      [TRADING_QUERY_PARAM_STATUS]: searchParams.status,
      [TRADING_QUERY_PARAM_CURRENCY]: searchParams.currency,
      [TRADING_QUERY_PARAM_OUTSTANDING_MIN]: searchParams.outstandingMin,
      [TRADING_QUERY_PARAM_OUTSTANDING_MAX]: searchParams.outstandingMax,
      [TRADING_QUERY_PARAM_SORT_BY]: searchParams.sortBy,
      [TRADING_QUERY_PARAM_SORT_ORDER]: searchParams.sortOrder,
    })
    expect(apiFetchMock).toHaveBeenCalledWith(`/payables/search?${query.toString()}`)
  })

  it('rejects ledger search payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 20,
    })

    await expect(searchPayableLedgers(searchParams)).rejects.toThrow()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCustomerList } from './customer-service'

const apiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({ apiFetch }))

const emptyCustomerListResponse = {
  items: [],
  total: 0,
  page: 2,
  pageSize: 20,
  metadata: {
    pagination: { total: 0, page: 2, pageSize: 20 },
    stats: { total: 0, active: 0, newThisMonth: 0 },
  },
}

describe('customer list query contract', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(emptyCustomerListResponse)
  })

  it('sends pagination, normalized search, and deleted scope to the backend', async () => {
    await getCustomerList({
      page: 2,
      pageSize: 20,
      search: '  ACME China  ',
      includeDeleted: true,
    })

    const requestedUrl = String(apiFetch.mock.calls[0]?.[0])
    const params = new URL(requestedUrl, 'http://localhost').searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('pageSize')).toBe('20')
    expect(params.get('search')).toBe('ACME China')
    expect(params.get('includeDeleted')).toBe('true')
  })

  it('uses stable defaults without enabling deleted records', async () => {
    await getCustomerList()

    const requestedUrl = String(apiFetch.mock.calls[0]?.[0])
    const params = new URL(requestedUrl, 'http://localhost').searchParams
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('50')
    expect(params.has('search')).toBe(false)
    expect(params.has('includeDeleted')).toBe(false)
  })
})

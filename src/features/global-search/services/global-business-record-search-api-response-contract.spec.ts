import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { fetchGlobalBusinessRecordSearchPage } from './global-business-record-search-api'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

function createValidGlobalBusinessSearchPageForContractTests() {
  return {
    data: [
      {
        id: 'order-1',
        title: '订单',
        code: 'SO-1',
        category: 'sales-order',
        parentTitle: '销售',
        href: '/trading/sales-orders?detailId=order-1',
      },
    ],
    hasMore: false,
    nextOffset: 1,
    generation: 'snapshot-1',
    candidateLimitReached: false,
  }
}

describe('global business search API response contract', () => {
  afterEach(() => vi.mocked(apiFetch).mockReset())

  it('preserves literal keywords and the snapshot cursor while forwarding cancellation', async () => {
    const response = createValidGlobalBusinessSearchPageForContractTests()
    vi.mocked(apiFetch).mockResolvedValueOnce(response)
    const callerController = new AbortController()
    await expect(
      fetchGlobalBusinessRecordSearchPage(
        'A&B/#?',
        { offset: 30, generation: 'snapshot-1' },
        callerController.signal
      )
    ).resolves.toEqual(response)
    const [endpoint, options] = vi.mocked(apiFetch).mock.calls[0]
    const parameters = new URL(endpoint, 'https://search.test').searchParams
    expect(parameters.get('q')).toBe('A&B/#?')
    expect(parameters.get('offset')).toBe('30')
    expect(parameters.get('generation')).toBe('snapshot-1')
    expect(options).toMatchObject({
      signal: callerController.signal,
      circuitBreakerScope: 'global-business-search',
    })
  })

  it.each([
    {
      label: 'missing result list',
      response: { hasMore: false, nextOffset: 0, generation: '' },
    },
    {
      label: 'legacy pagination without a generation',
      response: { data: [], hasMore: false },
    },
    {
      label: 'invalid result destination',
      response: {
        ...createValidGlobalBusinessSearchPageForContractTests(),
        data: [
          {
            ...createValidGlobalBusinessSearchPageForContractTests().data[0],
            href: 'https://external.test',
          },
        ],
      },
    },
    {
      label: 'non-progressing offset',
      response: {
        ...createValidGlobalBusinessSearchPageForContractTests(),
        hasMore: true,
        nextOffset: 0,
      },
    },
    {
      label: 'continuation outside the candidate window',
      response: {
        ...createValidGlobalBusinessSearchPageForContractTests(),
        hasMore: true,
        nextOffset: 100000,
      },
    },
    {
      label: 'continuation after the candidate limit was reached',
      response: {
        ...createValidGlobalBusinessSearchPageForContractTests(),
        hasMore: true,
        nextOffset: 30,
        candidateLimitReached: true,
      },
    },
    {
      label: 'empty continuation generation',
      response: {
        ...createValidGlobalBusinessSearchPageForContractTests(),
        hasMore: true,
        generation: '',
      },
    },
  ])(
    'rejects $label instead of presenting no matches',
    async ({ response }) => {
      vi.mocked(apiFetch).mockResolvedValueOnce(response)
      await expect(
        fetchGlobalBusinessRecordSearchPage('order', { offset: 0 })
      ).rejects.toMatchObject({ kind: 'invalid_response' })
    }
  )

  it('rejects a later page from a different snapshot', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      createValidGlobalBusinessSearchPageForContractTests()
    )
    await expect(
      fetchGlobalBusinessRecordSearchPage('order', {
        offset: 30,
        generation: 'old-snapshot',
      })
    ).rejects.toMatchObject({ kind: 'invalid_response' })
  })

  it('accepts the explicit empty page returned when no business category is accessible', async () => {
    const response = {
      data: [],
      hasMore: false,
      nextOffset: 0,
      generation: '',
      candidateLimitReached: false,
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(response)
    await expect(
      fetchGlobalBusinessRecordSearchPage('order', { offset: 0 })
    ).resolves.toEqual(response)
  })

  it('preserves the explicit notice when matches exceed the candidate window', async () => {
    const response = {
      ...createValidGlobalBusinessSearchPageForContractTests(),
      nextOffset: 100000,
      candidateLimitReached: true,
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(response)
    await expect(
      fetchGlobalBusinessRecordSearchPage('order', {
        offset: 99999,
        generation: 'snapshot-1',
      })
    ).resolves.toEqual(response)
  })
})

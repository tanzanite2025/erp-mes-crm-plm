import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { QualityCoreService } from './quality-core-service'

const metadata = {
  pagination: {
    total: 1,
    page: 1,
    pageSize: 20,
  },
  stats: {
    total: 1,
    published: 1,
    draft: 0,
    archived: 0,
  },
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('QualityCoreService', () => {
  it('loads quality standards from the locked paginated object protocol', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'standard-1',
          code: 'QS-001',
          name: 'Incoming copper inspection',
          type: 'IQC',
          version: 1,
          status: 'PUBLISHED',
          auditor: 'QA',
          auditTime: null,
          remarks: '',
          items: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      metadata,
    })

    const result = await QualityCoreService.getStandards({
      page: 1,
      pageSize: 20,
      type: 'ALL',
      status: 'ALL',
      keyword: ' copper ',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/quality/standards?page=1&pageSize=20&type=ALL&status=ALL&keyword=copper'
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.code).toBe('QS-001')
    expect(result.metadata.stats.published).toBe(1)
  })

  it('rejects quality standards payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 20,
      metadata: {
        pagination: {
          total: 0,
          page: 1,
          pageSize: 20,
        },
        stats: {
          total: 0,
          published: 0,
          draft: 0,
          archived: 0,
        },
      },
    })

    await expect(
      QualityCoreService.getStandards({
        page: 1,
        pageSize: 20,
      })
    ).rejects.toThrow(
      '[INVALID_RESPONSE] QualityCoreService.getStandards expected "items" to be an array.'
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_KNOWLEDGE_BASE_ENTRIES } from '../data/knowledge-base'
import { knowledgeBaseService, parseKnowledgeBaseEntries } from './knowledge-base-service'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

describe('knowledgeBaseService parsing', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('keeps valid knowledge base entries from system config json', () => {
    const entries = parseKnowledgeBaseEntries(
      JSON.stringify([
        {
          id: 'kb-test',
          title: '装箱码如何使用',
          category: 'operation',
          summary: '先打印装箱码，再扫码绑定产品。',
          content: '手机端扫描已经贴在纸箱上的装箱码后，再录入箱内产品一维码。',
          keywords: ['装箱码', '手机扫码'],
          routePath: '/warehouse-config/packaging-assembly',
          updatedAt: '2026-05-02T00:00:00.000Z',
        },
      ])
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('装箱码如何使用')
  })

  it('falls back to seeded knowledge when config json is invalid', () => {
    expect(parseKnowledgeBaseEntries('not-json')).toEqual(DEFAULT_KNOWLEDGE_BASE_ENTRIES)
    expect(parseKnowledgeBaseEntries('[]')).toEqual(DEFAULT_KNOWLEDGE_BASE_ENTRIES)
  })

  it('searchEntries delegates ranking to the knowledge search endpoint', async () => {
    apiFetchMock.mockResolvedValue(DEFAULT_KNOWLEDGE_BASE_ENTRIES)

    await knowledgeBaseService.searchEntries('装箱码 一维码')

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/knowledge-base/entries/search?q=%E8%A3%85%E7%AE%B1%E7%A0%81%20%E4%B8%80%E7%BB%B4%E7%A0%81'
    )
  })

  it('recordView increments server-side click heat', async () => {
    apiFetchMock.mockResolvedValue(undefined)

    await knowledgeBaseService.recordView('entry-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/knowledge-base/entries/entry-1/view', {
      method: 'POST',
    })
  })
})

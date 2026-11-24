import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QualityStandardInspectionRulesValidationError } from '../adapters/quality-standard-api-adapter'
import { QualityCoreService } from './quality-core-service'

const qualityStandardListApiMocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  apiFetch: qualityStandardListApiMocks.apiFetch,
}))

const draftWithUnsupportedInspectionRules = {
  id: 'draft-with-old-rules',
  code: 'QCP-DEV-DRAFT',
  name: 'DEV 重量检测标准',
  type: 'FQC',
  status: 'DRAFT',
  version: 1,
  items: [
    {
      id: 'weight',
      name: '重量检测',
      centerValue: 450,
      unit: 'G',
      levels: [{ level: 'A', tolerance: 5, min: 445, max: 455 }],
    },
  ],
}

describe('quality standard summary queries are independent of inspection-rule validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the draft and all-status count when switching from published or rejected to all', async () => {
    qualityStandardListApiMocks.apiFetch.mockImplementation(
      async (path: string) => {
        const status = new URL(path, 'http://quality.test').searchParams.get(
          'status'
        )
        const items =
          status === 'ALL' || status === 'DRAFT'
            ? [draftWithUnsupportedInspectionRules]
            : []
        return {
          items,
          total: items.length,
          page: 1,
          pageSize: 20,
          metadata: {
            pagination: { total: items.length, page: 1, pageSize: 20 },
            stats: {
              total: 1,
              draft: 1,
              published: 0,
              rejected: 0,
              approved: 0,
              pendingApproval: 0,
              archived: 0,
            },
          },
        }
      }
    )
    for (const status of [
      'PUBLISHED',
      'REJECTED',
      'ALL',
      'DRAFT',
      'ALL',
    ] as const) {
      const response = await QualityCoreService.getStandards({
        status,
        page: 1,
        pageSize: 20,
      })
      expect(response.metadata.stats).toMatchObject({
        total: 1,
        draft: 1,
        published: 0,
        rejected: 0,
      })
      expect(response.total).toBe(
        status === 'ALL' || status === 'DRAFT' ? 1 : 0
      )
      if (response.total) {
        expect(response.items[0]).toMatchObject({
          id: draftWithUnsupportedInspectionRules.id,
          status: 'DRAFT',
        })
        expect(response.items[0]).not.toHaveProperty('items')
      }
    }
  })

  it('rejects unsupported rules while retaining the summary and original items for explicit reconfiguration', async () => {
    qualityStandardListApiMocks.apiFetch.mockResolvedValue(
      draftWithUnsupportedInspectionRules
    )
    await expect(
      QualityCoreService.getStandardById(draftWithUnsupportedInspectionRules.id)
    ).rejects.toMatchObject({
      name: QualityStandardInspectionRulesValidationError.name,
      kind: 'invalid_response',
      standardSummary: {
        id: draftWithUnsupportedInspectionRules.id,
        code: draftWithUnsupportedInspectionRules.code,
        name: draftWithUnsupportedInspectionRules.name,
        status: 'DRAFT',
        version: 1,
      },
      originalInspectionItems: draftWithUnsupportedInspectionRules.items,
    })
    expect(draftWithUnsupportedInspectionRules.items[0]).not.toHaveProperty(
      'gradingMode'
    )
  })
})

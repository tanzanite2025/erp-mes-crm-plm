import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSpecsMock, loggerMock } = vi.hoisted(() => ({
  getSpecsMock: vi.fn(),
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/features/engineering/services/engineering-spec-service', () => ({
  engineeringSpecService: {
    getSpecs: getSpecsMock,
    saveSpec: vi.fn(),
    deleteSpec: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => loggerMock,
}))

import { CuttingPlanService } from './cutting-plan-service'

describe('CuttingPlanService', () => {
  beforeEach(() => {
    getSpecsMock.mockReset()
    loggerMock.debug.mockReset()
    loggerMock.info.mockReset()
    loggerMock.warn.mockReset()
    loggerMock.error.mockReset()
  })

  it('returns valid items and isolated invalid summaries in listReadModel', async () => {
    getSpecsMock.mockResolvedValue([
      {
        id: 'plan-1',
        name: 'ignored-name',
        code: 'CUTTING-001',
        type: 'CUTTING_PLAN',
        description: '',
        active: true,
        cuttingData: {
          name: '产品A-14孔裁纱单',
          productId: 'product-1',
          productCode: 'P-001',
          productName: '产品A',
          holeCount: '14',
          status: 'Active',
          version: 1,
          lines: [
            {
              id: 'line-1',
              sequenceNo: 1,
            },
          ],
        },
        _v: 1,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
      {
        id: 'plan-bad',
        name: '坏记录后备名',
        code: 'CUTTING-BAD',
        type: 'CUTTING_PLAN',
        description: '',
        active: true,
        cuttingData: {
          name: '损坏裁纱单',
          lines: [
            {
              sequenceNo: 1,
            },
          ],
        },
        _v: 3,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    ])

    const result = await CuttingPlanService.listReadModel()

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('plan-1')
    expect(result.invalidItems).toEqual([
      expect.objectContaining({
        specId: 'plan-bad',
        specCode: 'CUTTING-BAD',
        displayName: '损坏裁纱单',
        failureType: 'invalid_lines',
        failureLabel: 'Invalid lines',
      }),
    ])
    expect(result.invalidItems[0].reason.length).toBeGreaterThan(0)
    expect(loggerMock.warn).toHaveBeenCalledTimes(1)
  })

  it('classifies top-level required field failures separately from line failures', async () => {
    getSpecsMock.mockResolvedValue([
      {
        id: 'plan-missing-fields',
        name: '',
        code: 'CUTTING-MISSING',
        type: 'CUTTING_PLAN',
        description: '',
        active: true,
        cuttingData: {},
        _v: 1,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    ])

    const result = await CuttingPlanService.listReadModel()

    expect(result.items).toHaveLength(0)
    expect(result.invalidItems).toEqual([
      expect.objectContaining({
        specId: 'plan-missing-fields',
        failureType: 'missing_required_fields',
        failureLabel: 'Missing required fields',
      }),
    ])
  })

  it('keeps list compatible by returning only valid cutting plans', async () => {
    getSpecsMock.mockResolvedValue([
      {
        id: 'plan-1',
        name: 'ignored-name',
        code: 'CUTTING-001',
        type: 'CUTTING_PLAN',
        description: '',
        active: true,
        cuttingData: {
          name: '产品A-14孔裁纱单',
          productId: 'product-1',
          productCode: 'P-001',
          productName: '产品A',
          holeCount: '14',
          status: 'Active',
          version: 1,
          lines: [
            {
              id: 'line-1',
              sequenceNo: 1,
            },
          ],
        },
        _v: 1,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
      {
        id: 'plan-bad',
        name: '坏记录后备名',
        code: 'CUTTING-BAD',
        type: 'CUTTING_PLAN',
        description: '',
        active: true,
        cuttingData: {
          name: '损坏裁纱单',
          lines: [
            {
              sequenceNo: 1,
            },
          ],
        },
        _v: 3,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    ])

    const items = await CuttingPlanService.list()

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('plan-1')
  })
})

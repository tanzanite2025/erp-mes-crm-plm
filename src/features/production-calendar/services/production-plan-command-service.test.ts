import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { ProductionPlanCommandService } from './production-plan-command-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('ProductionPlanCommandService', () => {
  it('saves production plans through the official command entry', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'plan-1',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
      status: 'SCHEDULED',
      tasks: [
        {
          id: 'task-1',
          planId: 'plan-1',
          status: 'RUNNING',
          batchNo: 'B-001',
          processName: 'Spoke drilling',
          operator: 'alice',
          targetQty: 100,
          actualQty: 20,
        },
      ],
    })

    const saved = await ProductionPlanCommandService.saveProductionPlan({
      orderNo: 'SO-001',
      status: 'SCHEDULED',
      tasks: [
        {
          status: 'PENDING',
        },
      ],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/production/plans', {
      method: 'POST',
      body: JSON.stringify({
        orderNo: 'SO-001',
        status: 'SCHEDULED',
        tasks: [
          {
            status: 'PENDING',
          },
        ],
      }),
    })
    expect(saved.id).toBe('plan-1')
  })

  it('rejects non-canonical plan statuses before saving', async () => {
    await expect(
      ProductionPlanCommandService.saveProductionPlan({
        orderNo: 'SO-001',
        status: 'PLANNING',
      })
    ).rejects.toThrow('Invalid production plan status: PLANNING')

    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('rejects non-canonical task statuses before saving', async () => {
    await expect(
      ProductionPlanCommandService.saveProductionPlan({
        orderNo: 'SO-001',
        status: 'SCHEDULED',
        tasks: [
          {
            status: 'Scheduled',
          },
        ],
      })
    ).rejects.toThrow('Invalid production task status: Scheduled')

    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('rejects non-canonical plan statuses returned by the backend', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'plan-1',
      orderNo: 'SO-001',
      status: 'Scheduled',
      tasks: [],
    })

    await expect(
      ProductionPlanCommandService.saveProductionPlan({
        orderNo: 'SO-001',
        status: 'SCHEDULED',
      })
    ).rejects.toThrow('Invalid production plan status: Scheduled')
  })
})

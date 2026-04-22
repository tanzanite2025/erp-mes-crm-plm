import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  getProductionRuleSnapshots,
  getProductionTaskRuleSnapshots,
} from './production-task-query-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('getProductionTaskRuleSnapshots', () => {
  it('flattens production plan tasks into canonical rule snapshots', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'plan-1',
          orderNo: 'SO-001',
          productName: 'Wheel Hub',
          quantity: 100,
          status: 'SCHEDULED',
          startDate: '2026-04-20T00:00:00.000Z',
          endDate: '2026-04-21T00:00:00.000Z',
          tasks: [
            {
              id: 'task-1',
              planId: 'plan-1',
              batchNo: 'B-001',
              processName: 'Spoke drilling',
              targetQty: 100,
              actualQty: 40,
              status: 'RUNNING',
              operator: 'alice',
            },
          ],
        },
      ],
    })

    await expect(getProductionTaskRuleSnapshots()).resolves.toEqual([
      {
        id: 'task-1',
        planId: 'plan-1',
        status: 'RUNNING',
        batchNo: 'B-001',
        processName: 'Spoke drilling',
        operator: 'alice',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
        targetQty: 100,
        actualQty: 40,
      },
    ])

    expect(apiFetchMock).toHaveBeenCalledWith('/production/plans?pageSize=1000')
  })

  it('returns production plan and task snapshots from one production plans response', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'plan-1',
          orderNo: 'SO-001',
          productName: 'Wheel Hub',
          quantity: 100,
          status: 'IN_PROGRESS',
          startDate: '2026-04-20T00:00:00.000Z',
          endDate: null,
          tasks: [
            {
              id: 'task-1',
              planId: 'plan-1',
              status: 'RUNNING',
            },
          ],
        },
      ],
    })

    await expect(getProductionRuleSnapshots()).resolves.toEqual({
      productionPlans: [
        {
          id: 'plan-1',
          status: 'IN_PROGRESS',
          orderNo: 'SO-001',
          productName: 'Wheel Hub',
          quantity: 100,
          startDate: '2026-04-20T00:00:00.000Z',
          endDate: null,
        },
      ],
      productionTasks: [
        {
          id: 'task-1',
          planId: 'plan-1',
          status: 'RUNNING',
          batchNo: '',
          processName: '',
          operator: '',
          orderNo: 'SO-001',
          productName: 'Wheel Hub',
          targetQty: 0,
          actualQty: 0,
        },
      ],
    })

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(apiFetchMock).toHaveBeenCalledWith('/production/plans?pageSize=1000')
  })

  it('rejects non-canonical production plan statuses', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'plan-1',
          status: 'PLANNING',
          tasks: [],
        },
      ],
    })

    await expect(getProductionRuleSnapshots()).rejects.toThrow(
      'Invalid production plan status: PLANNING'
    )
  })

  it('rejects non-canonical production task statuses', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'plan-1',
          status: 'SCHEDULED',
          tasks: [
            {
              id: 'task-1',
              planId: 'plan-1',
              status: 'Scheduled',
            },
          ],
        },
      ],
    })

    await expect(getProductionTaskRuleSnapshots()).rejects.toThrow(
      'Invalid production task status: Scheduled'
    )
  })
})

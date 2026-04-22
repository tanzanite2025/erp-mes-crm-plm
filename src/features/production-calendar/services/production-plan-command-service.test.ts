import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiFetchMock,
  notifyCreatedMock,
  notifyStatusMock,
  notifyPlanCreatedMock,
  notifyPlanStatusMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  notifyCreatedMock: vi.fn(),
  notifyStatusMock: vi.fn(),
  notifyPlanCreatedMock: vi.fn(),
  notifyPlanStatusMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('@/features/system-mgmt/notifications/notification-service', () => ({
  NotificationService: {
    notifyProductionTaskCreated: notifyCreatedMock,
    notifyProductionTaskStatus: notifyStatusMock,
    notifyProductionPlanCreated: notifyPlanCreatedMock,
    notifyProductionPlanStatus: notifyPlanStatusMock,
  },
}))

import {
  dispatchProductionPlanEvents,
  dispatchProductionTaskEvents,
  ProductionPlanCommandService,
} from './production-plan-command-service'

beforeEach(() => {
  apiFetchMock.mockReset()
  notifyCreatedMock.mockReset()
  notifyStatusMock.mockReset()
  notifyPlanCreatedMock.mockReset()
  notifyPlanStatusMock.mockReset()
})

describe('ProductionPlanCommandService', () => {
  it('saves production plans through the official command entry and dispatches task events', async () => {
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
    expect(notifyPlanCreatedMock).toHaveBeenCalledWith({
      id: 'plan-1',
      status: 'SCHEDULED',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
    })
    expect(notifyCreatedMock).toHaveBeenCalledWith({
      id: 'task-1',
      planId: 'plan-1',
      status: 'RUNNING',
      batchNo: 'B-001',
      processName: 'Spoke drilling',
      operator: 'alice',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
      targetQty: 100,
      actualQty: 20,
    })
  })

  it('dispatches production plan status events only when the plan status changes', () => {
    dispatchProductionPlanEvents(
      {
        id: 'plan-1',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
        quantity: 100,
        status: 'IN_PROGRESS',
      },
      {
        id: 'plan-1',
        status: 'SCHEDULED',
      }
    )

    expect(notifyPlanCreatedMock).not.toHaveBeenCalled()
    expect(notifyPlanStatusMock).toHaveBeenCalledWith({
      id: 'plan-1',
      status: 'IN_PROGRESS',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
      quantity: 100,
    })
  })

  it('rejects non-canonical plan statuses before saving', async () => {
    await expect(
      ProductionPlanCommandService.saveProductionPlan({
        orderNo: 'SO-001',
        status: 'PLANNING',
      })
    ).rejects.toThrow('Invalid production plan status: PLANNING')

    expect(apiFetchMock).not.toHaveBeenCalled()
    expect(notifyCreatedMock).not.toHaveBeenCalled()
    expect(notifyStatusMock).not.toHaveBeenCalled()
    expect(notifyPlanCreatedMock).not.toHaveBeenCalled()
    expect(notifyPlanStatusMock).not.toHaveBeenCalled()
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
    expect(notifyCreatedMock).not.toHaveBeenCalled()
    expect(notifyStatusMock).not.toHaveBeenCalled()
    expect(notifyPlanCreatedMock).not.toHaveBeenCalled()
    expect(notifyPlanStatusMock).not.toHaveBeenCalled()
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

    expect(notifyCreatedMock).not.toHaveBeenCalled()
    expect(notifyStatusMock).not.toHaveBeenCalled()
    expect(notifyPlanCreatedMock).not.toHaveBeenCalled()
    expect(notifyPlanStatusMock).not.toHaveBeenCalled()
  })

  it('dispatches status events only for changed existing tasks', () => {
    dispatchProductionTaskEvents(
      {
        id: 'plan-1',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
        tasks: [
          {
            id: 'task-1',
            planId: 'plan-1',
            status: 'HOLD',
            processName: 'Spoke drilling',
          },
          {
            id: 'task-2',
            planId: 'plan-1',
            status: 'PENDING',
          },
        ],
      },
      {
        id: 'plan-1',
        tasks: [
          {
            id: 'task-1',
            planId: 'plan-1',
            status: 'RUNNING',
          },
          {
            id: 'task-2',
            planId: 'plan-1',
            status: 'PENDING',
          },
        ],
      }
    )

    expect(notifyCreatedMock).not.toHaveBeenCalled()
    expect(notifyStatusMock).toHaveBeenCalledTimes(1)
    expect(notifyStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        planId: 'plan-1',
        status: 'HOLD',
        processName: 'Spoke drilling',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
      })
    )
  })

  it('rejects non-canonical task statuses before dispatching', () => {
    expect(() =>
      dispatchProductionTaskEvents({
        id: 'plan-1',
        tasks: [
          {
            id: 'task-1',
            planId: 'plan-1',
            status: 'Scheduled',
          },
        ],
      })
    ).toThrow('Invalid production task status: Scheduled')

    expect(notifyCreatedMock).not.toHaveBeenCalled()
    expect(notifyStatusMock).not.toHaveBeenCalled()
  })
})

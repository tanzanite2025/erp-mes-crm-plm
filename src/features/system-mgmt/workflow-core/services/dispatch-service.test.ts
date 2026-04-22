import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationRule } from '../data/notification-rule-schema'
import type { StandardCommand } from '../data/schema'

const {
  executeRoutingRulesMock,
  getCommandsMock,
  getItemMock,
  setItemMock,
} = vi.hoisted(() => ({
  executeRoutingRulesMock: vi.fn(),
  getCommandsMock: vi.fn(),
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
}))

vi.mock('../services/routing-service', () => ({
  RoutingService: {
    getCommands: getCommandsMock,
  },
}))

vi.mock('@/features/system-mgmt/services/storage-service', () => ({
  StorageService: {
    getItem: getItemMock,
    setItem: setItemMock,
  },
}))

vi.mock('./rule-execution-core', () => ({
  executeRoutingRules: executeRoutingRulesMock,
}))

import { DispatchService } from './dispatch-service'

describe('DispatchService.scanByRules', () => {
  beforeEach(() => {
    executeRoutingRulesMock.mockReset()
    getCommandsMock.mockReset()
    getItemMock.mockReset()
    setItemMock.mockReset()
  })

  it('delegates retroactive scans to the shared rule execution core', async () => {
    const rules: NotificationRule[] = [
      {
        id: 'rule-1',
        name: 'sales-order-pending',
        enabled: true,
        entity: 'ORDER',
        sourceCode: 'SALES_ORDER',
        actionCode: 'STATUS_CHANGED',
        segments: [],
        createdAt: '2026-04-18T00:00:00.000Z',
        version: 3,
      },
    ]
    const commands: StandardCommand[] = [
      {
        id: 'cmd-1',
        actionType: 'NOTIFY',
        bindType: 'GLOBAL',
        title: 'Pending order',
        content: 'Order [OrderNo] is pending',
        targetLink: '/trading/orders/[OrderId]',
        createdAt: '2026-04-18T00:00:00.000Z',
      },
    ]
    const snapshots = {
      salesOrders: [
        {
          id: 'order-1',
          orderNo: 'SO-001',
          status: 'Pending',
          createdBy: 'alice',
          lines: [
            {
              productModel: 'Cable-X1',
              claimedBy: 'bob',
            },
          ],
        },
      ],
      purchaseOrders: [
        {
          id: 'purchase-1',
          orderNo: 'PO-001',
          status: 'Awaiting',
          supplierName: 'Shenzhen Metals',
          purchaser: 'iris',
          lines: [
            {
              materialName: 'Copper Sheet',
            },
          ],
        },
      ],
      productionTasks: [
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
      ],
      productionPlans: [
        {
          id: 'plan-1',
          status: 'COMPLETED',
          orderNo: 'SO-001',
          productName: 'Wheel Hub',
          quantity: 100,
          startDate: '2026-04-20T00:00:00.000Z',
          endDate: '2026-04-21T00:00:00.000Z',
        },
      ],
    }

    getCommandsMock.mockResolvedValue(commands)
    getItemMock.mockResolvedValue(['approval-key-existing'])

    executeRoutingRulesMock
      .mockResolvedValueOnce({
        matchedCount: 1,
        notifiedCount: 2,
        approvalCreatedCount: 1,
        skippedNotificationCount: 0,
        skippedApprovalCount: 0,
        processedApprovalKeys: ['approval-key-new'],
      })
      .mockResolvedValueOnce({
        matchedCount: 1,
        notifiedCount: 1,
        approvalCreatedCount: 0,
        skippedNotificationCount: 0,
        skippedApprovalCount: 0,
        processedApprovalKeys: [],
      })
      .mockResolvedValueOnce({
        matchedCount: 1,
        notifiedCount: 1,
        approvalCreatedCount: 0,
        skippedNotificationCount: 0,
        skippedApprovalCount: 0,
        processedApprovalKeys: [],
      })
      .mockResolvedValueOnce({
        matchedCount: 1,
        notifiedCount: 1,
        approvalCreatedCount: 0,
        skippedNotificationCount: 0,
        skippedApprovalCount: 0,
        processedApprovalKeys: [],
      })

    const result = await DispatchService.scanByRules(rules, snapshots)

    expect(getCommandsMock).toHaveBeenCalledTimes(1)
    expect(getItemMock).toHaveBeenCalledWith(
      'xdfc_processed_rule_approval_ids'
    )
    expect(executeRoutingRulesMock).toHaveBeenCalledTimes(4)

    const salesCall = executeRoutingRulesMock.mock.calls[0]?.[0] as {
      rules: NotificationRule[]
      commands: StandardCommand[]
      mode: string
      processedApprovalKeys: Set<string>
      event: {
        type: string
        action: string
        sourceCode: string
        targetStatus: string
        actionUrl: string
        metadata: Record<string, unknown>
      }
    }

    expect(salesCall.rules).toEqual(rules)
    expect(salesCall.commands).toEqual(commands)
    expect(salesCall.mode).toBe('retroactive')
    expect(salesCall.processedApprovalKeys).toBeInstanceOf(Set)
    expect(salesCall.processedApprovalKeys.has('approval-key-existing')).toBe(true)
    expect(salesCall.event).toEqual({
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: 'Pending',
      actionUrl: '/trading/sales-orders?search=SO-001&detailId=order-1',
      metadata: expect.objectContaining({
        id: 'order-1',
        orderId: 'order-1',
        OrderId: 'order-1',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        status: 'Pending',
        ProductName: 'Cable-X1',
        claimedBy: 'bob',
        createdBy: 'alice',
        sourceCode: 'SALES_ORDER',
      }),
    })

    const purchaseCall = executeRoutingRulesMock.mock.calls[1]?.[0] as {
      processedApprovalKeys: Set<string>
      event: {
        type: string
        action: string
        sourceCode: string
        targetStatus: string
        actionUrl: string
        metadata: Record<string, unknown>
      }
    }

    expect(purchaseCall.processedApprovalKeys.has('approval-key-existing')).toBe(
      true
    )
    expect(purchaseCall.processedApprovalKeys.has('approval-key-new')).toBe(true)
    expect(purchaseCall.event).toEqual({
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'PURCHASE_ORDER',
      targetStatus: 'Awaiting',
      actionUrl: '/purchase/orders?search=PO-001&detailId=purchase-1',
      metadata: expect.objectContaining({
        id: 'purchase-1',
        purchaseOrderId: 'purchase-1',
        PurchaseOrderId: 'purchase-1',
        orderId: 'purchase-1',
        OrderId: 'purchase-1',
        purchaseOrderNo: 'PO-001',
        PurchaseOrderNo: 'PO-001',
        orderNo: 'PO-001',
        OrderNo: 'PO-001',
        status: 'Awaiting',
        supplierName: 'Shenzhen Metals',
        SupplierName: 'Shenzhen Metals',
        purchaser: 'iris',
        Purchaser: 'iris',
        MaterialName: 'Copper Sheet',
        sourceCode: 'PURCHASE_ORDER',
      }),
    })

    const productionCall = executeRoutingRulesMock.mock.calls[2]?.[0] as {
      processedApprovalKeys: Set<string>
      event: {
        type: string
        action: string
        sourceCode: string
        targetStatus: string
        actionUrl: string
        metadata: Record<string, unknown>
      }
    }

    expect(productionCall.processedApprovalKeys.has('approval-key-existing')).toBe(
      true
    )
    expect(productionCall.processedApprovalKeys.has('approval-key-new')).toBe(true)
    expect(productionCall.event).toEqual({
      type: 'TASK_ASSIGNED',
      action: 'STATUS_CHANGED',
      sourceCode: 'PRODUCTION_TASK',
      targetStatus: 'RUNNING',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: expect.objectContaining({
        id: 'task-1',
        taskId: 'task-1',
        TaskId: 'task-1',
        planId: 'plan-1',
        PlanId: 'plan-1',
        status: 'RUNNING',
        batchNo: 'B-001',
        BatchNo: 'B-001',
        processName: 'Spoke drilling',
        ProcessName: 'Spoke drilling',
        operator: 'alice',
        Operator: 'alice',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        productName: 'Wheel Hub',
        ProductName: 'Wheel Hub',
        targetQty: 100,
        TargetQty: 100,
        actualQty: 40,
        ActualQty: 40,
        sourceCode: 'PRODUCTION_TASK',
      }),
    })

    const productionPlanCall = executeRoutingRulesMock.mock.calls[3]?.[0] as {
      processedApprovalKeys: Set<string>
      event: {
        type: string
        action: string
        sourceCode: string
        targetStatus: string
        actionUrl: string
        metadata: Record<string, unknown>
      }
    }

    expect(
      productionPlanCall.processedApprovalKeys.has('approval-key-existing')
    ).toBe(true)
    expect(productionPlanCall.processedApprovalKeys.has('approval-key-new')).toBe(
      true
    )
    expect(productionPlanCall.event).toEqual({
      type: 'SYSTEM_NOTICE',
      action: 'STATUS_CHANGED',
      sourceCode: 'PRODUCTION_PLAN',
      targetStatus: 'COMPLETED',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: expect.objectContaining({
        id: 'plan-1',
        planId: 'plan-1',
        PlanId: 'plan-1',
        status: 'COMPLETED',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        productName: 'Wheel Hub',
        ProductName: 'Wheel Hub',
        quantity: 100,
        Quantity: 100,
        startDate: '2026-04-20T00:00:00.000Z',
        StartDate: '2026-04-20T00:00:00.000Z',
        endDate: '2026-04-21T00:00:00.000Z',
        EndDate: '2026-04-21T00:00:00.000Z',
        sourceCode: 'PRODUCTION_PLAN',
      }),
    })

    expect(setItemMock).toHaveBeenCalledWith(
      'xdfc_processed_rule_approval_ids',
      expect.arrayContaining(['approval-key-existing', 'approval-key-new'])
    )
    expect(result).toBe(5)
  })
})

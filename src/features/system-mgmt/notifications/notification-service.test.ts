import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationRule } from '../workflow-core/data/notification-rule-schema'
import type { StandardCommand } from '../workflow-core/data/schema'

const {
  executeRoutingRulesMock,
  getRulesMock,
  getCommandsMock,
} = vi.hoisted(() => ({
  executeRoutingRulesMock: vi.fn(),
  getRulesMock: vi.fn(),
  getCommandsMock: vi.fn(),
}))

vi.mock('../workflow-core/services/rule-execution-core', () => ({
  executeRoutingRules: executeRoutingRulesMock,
  resolveTemplate: vi.fn(),
}))

vi.mock('../workflow-core/services/routing-service', () => ({
  RoutingService: {
    getRules: getRulesMock,
    getCommands: getCommandsMock,
  },
}))

import { NotificationService } from './notification-service'

describe('NotificationService.dispatch', () => {
  beforeEach(() => {
    executeRoutingRulesMock.mockReset()
    getRulesMock.mockReset()
    getCommandsMock.mockReset()
  })

  it('delegates live dispatch to the shared rule execution core', async () => {
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
        version: 1,
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
    const coreResult = {
      matchedCount: 1,
      notifiedCount: 1,
      approvalCreatedCount: 0,
      skippedNotificationCount: 0,
      skippedApprovalCount: 0,
      processedApprovalKeys: [],
    }

    getRulesMock.mockResolvedValue(rules)
    getCommandsMock.mockResolvedValue(commands)
    executeRoutingRulesMock.mockResolvedValue(coreResult)

    const result = await NotificationService.dispatch('ORDER_EVENT', {
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: 'Pending',
      priority: 'info',
      actionUrl: '/trading/orders/order-1',
      metadata: {
        orderId: 'order-1',
        OrderId: 'order-1',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
      },
    })

    expect(getRulesMock).toHaveBeenCalledTimes(1)
    expect(getCommandsMock).toHaveBeenCalledTimes(1)
    expect(executeRoutingRulesMock).toHaveBeenCalledTimes(1)
    expect(executeRoutingRulesMock).toHaveBeenCalledWith({
      rules,
      commands,
      mode: 'live',
      event: {
        type: 'ORDER_EVENT',
        action: 'STATUS_CHANGED',
        sourceCode: 'SALES_ORDER',
        targetStatus: 'Pending',
        priority: 'info',
        actionUrl: '/trading/orders/order-1',
        metadata: {
          orderId: 'order-1',
          OrderId: 'order-1',
          orderNo: 'SO-001',
          OrderNo: 'SO-001',
        },
      },
    })
    expect(result).toEqual(coreResult)
  })

  it('dispatches purchase order created events through the shared live core', async () => {
    const dispatchSpy = vi
      .spyOn(NotificationService, 'dispatch')
      .mockResolvedValue(undefined)

    NotificationService.notifyPurchaseOrderCreated({
      id: 'purchase-1',
      orderNo: 'PO-001',
      status: 'Draft',
      supplierName: 'Shenzhen Metals',
      purchaser: 'Iris',
      materialName: 'Copper Sheet',
    })

    expect(dispatchSpy).toHaveBeenCalledWith('ORDER_EVENT', {
      action: 'CREATED',
      sourceCode: 'PURCHASE_ORDER',
      targetStatus: 'Draft',
      actionUrl: '/purchase/orders?search=PO-001&detailId=purchase-1',
      metadata: expect.objectContaining({
        purchaseOrderId: 'purchase-1',
        PurchaseOrderNo: 'PO-001',
        SupplierName: 'Shenzhen Metals',
        Purchaser: 'Iris',
        MaterialName: 'Copper Sheet',
        sourceCode: 'PURCHASE_ORDER',
      }),
    })

    dispatchSpy.mockRestore()
  })

  it('dispatches production task status events through the shared live core', async () => {
    const dispatchSpy = vi
      .spyOn(NotificationService, 'dispatch')
      .mockResolvedValue(undefined)

    NotificationService.notifyProductionTaskStatus({
      id: 'task-1',
      planId: 'plan-1',
      status: 'HOLD',
      batchNo: 'B-001',
      processName: 'Spoke drilling',
      operator: 'alice',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
      targetQty: 100,
      actualQty: 40,
    })

    expect(dispatchSpy).toHaveBeenCalledWith('TASK_ASSIGNED', {
      action: 'QUALITY_HOLD',
      sourceCode: 'PRODUCTION_TASK',
      targetStatus: 'HOLD',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: expect.objectContaining({
        taskId: 'task-1',
        TaskId: 'task-1',
        PlanId: 'plan-1',
        BatchNo: 'B-001',
        ProcessName: 'Spoke drilling',
        Operator: 'alice',
        OrderNo: 'SO-001',
        ProductName: 'Wheel Hub',
        TargetQty: 100,
        ActualQty: 40,
        sourceCode: 'PRODUCTION_TASK',
      }),
    })

    dispatchSpy.mockRestore()
  })

  it('dispatches production plan status events through the shared live core', async () => {
    const dispatchSpy = vi
      .spyOn(NotificationService, 'dispatch')
      .mockResolvedValue(undefined)

    NotificationService.notifyProductionPlanStatus({
      id: 'plan-1',
      status: 'COMPLETED',
      orderNo: 'SO-001',
      productName: 'Wheel Hub',
      quantity: 100,
      startDate: '2026-04-20T00:00:00.000Z',
      endDate: '2026-04-21T00:00:00.000Z',
    })

    expect(dispatchSpy).toHaveBeenCalledWith('SYSTEM_NOTICE', {
      action: 'COMPLETED',
      sourceCode: 'PRODUCTION_PLAN',
      targetStatus: 'COMPLETED',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: expect.objectContaining({
        id: 'plan-1',
        planId: 'plan-1',
        PlanId: 'plan-1',
        status: 'COMPLETED',
        OrderNo: 'SO-001',
        ProductName: 'Wheel Hub',
        Quantity: 100,
        StartDate: '2026-04-20T00:00:00.000Z',
        EndDate: '2026-04-21T00:00:00.000Z',
        sourceCode: 'PRODUCTION_PLAN',
      }),
    })

    dispatchSpy.mockRestore()
  })
})

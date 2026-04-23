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

})

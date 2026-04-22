import { describe, expect, it } from 'vitest'
import { deserializeRuleExecutionLogPage } from './rule-execution-log-schema'

describe('rule-execution-log-schema', () => {
  it('accepts the canonical paged response shape', () => {
    expect(
      deserializeRuleExecutionLogPage({
        items: [
          {
            id: 'log-1',
            createdAt: '2026-04-18T07:30:00.000Z',
            updatedAt: '2026-04-18T07:30:00.000Z',
            eventKey: 'event-1',
            entity: 'ORDER',
            sourceCode: 'SALES_ORDER',
            actionCode: 'STATUS_CHANGED',
            statusCode: 'Pending',
            ruleId: 'rule-1',
            ruleName: 'Sales Order Pending',
            segmentId: 'segment-1',
            segmentTitle: 'Pending Review',
            executionType: 'notify',
            executionStatus: 'success',
            commandId: 'cmd-1',
            title: 'Pending Order',
            content: 'Order SO-001 is pending',
            actionUrl: '/trading/orders/order-1',
            targets: ['alice'],
            metadata: { OrderId: 'order-1' },
            result: { mode: 'live' },
            errorMessage: '',
            triggeredAt: '2026-04-18T07:30:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      })
    ).toEqual({
      items: [
        {
          id: 'log-1',
          createdAt: '2026-04-18T07:30:00.000Z',
          updatedAt: '2026-04-18T07:30:00.000Z',
          eventKey: 'event-1',
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          ruleName: 'Sales Order Pending',
          segmentId: 'segment-1',
          segmentTitle: 'Pending Review',
          executionType: 'notify',
          executionStatus: 'success',
          commandId: 'cmd-1',
          title: 'Pending Order',
          content: 'Order SO-001 is pending',
          actionUrl: '/trading/orders/order-1',
          targets: ['alice'],
          metadata: { OrderId: 'order-1' },
          result: { mode: 'live' },
          errorMessage: '',
          triggeredAt: '2026-04-18T07:30:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it('rejects legacy array responses so the protocol cannot drift silently', () => {
    expect(() =>
      deserializeRuleExecutionLogPage([
        {
          id: 'log-1',
          createdAt: '2026-04-18T07:30:00.000Z',
          updatedAt: '2026-04-18T07:30:00.000Z',
          eventKey: 'event-1',
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          ruleName: 'Sales Order Pending',
          segmentId: 'segment-1',
          segmentTitle: 'Pending Review',
          executionType: 'notify',
          executionStatus: 'success',
          commandId: 'cmd-1',
          title: 'Pending Order',
          content: 'Order SO-001 is pending',
          actionUrl: '/trading/orders/order-1',
          targets: ['alice'],
          metadata: { OrderId: 'order-1' },
          result: { mode: 'live' },
          errorMessage: '',
          triggeredAt: '2026-04-18T07:30:00.000Z',
        },
      ])
    ).toThrow()
  })
})

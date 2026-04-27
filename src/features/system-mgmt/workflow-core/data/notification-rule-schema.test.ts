import { describe, expect, it } from 'vitest'
import {
  deserializeNotificationRule,
  serializeNotificationRule,
} from './notification-rule-schema'

describe('notification-rule-schema', () => {
  it('normalizes legacy sales order rules to the status changed event contract', () => {
    const rule = deserializeNotificationRule({
      id: 'rule-1',
      name: 'Legacy sales approval',
      enabled: true,
      entity: 'ORDER',
      sourceCode: 'ORDER',
      actionCode: 'SALES_ORDER_PENDING_APPROVAL',
      segments: [
        {
          title: 'Pending approval',
          targetStatuses: ['Pending'],
        },
      ],
      createdAt: '2026-04-23T00:00:00.000Z',
      version: 1,
    })

    expect(rule.sourceCode).toBe('SALES_ORDER')
    expect(rule.actionCode).toBe('STATUS_CHANGED')
    expect(rule.segments[0].id).toBe('segment-pending-approval-pending-1')
  })

  it('normalizes sales order write payloads before saving', () => {
    const payload = serializeNotificationRule({
      name: 'Legacy sales write',
      enabled: true,
      entity: 'ORDER',
      sourceCode: 'SALES_ORDER',
      actionCode: 'ORDER_REVIEW',
      segments: [
        {
          id: 'segment-1',
          title: 'Pending',
          targetStatuses: ['Pending'],
          commandIds: [],
          assigneeGroups: [],
          assigneeUsernames: [],
          resolveOnStatuses: ['Done'],
          dynamicTargetField: null,
        },
      ],
      version: 1,
    })

    expect(payload.sourceCode).toBe('SALES_ORDER')
    expect(payload.actionCode).toBe('STATUS_CHANGED')
  })

  it('normalizes purchase and production rules to status changed routing', () => {
    const purchase = serializeNotificationRule({
      name: 'Purchase received',
      enabled: true,
      entity: 'ORDER',
      sourceCode: 'PURCHASE_ORDER',
      actionCode: 'RECEIVED',
      segments: [],
      version: 1,
    })
    const production = serializeNotificationRule({
      name: 'Production done',
      enabled: true,
      entity: 'SYSTEM',
      sourceCode: 'PRODUCTION_PLAN',
      actionCode: 'COMPLETED',
      segments: [],
      version: 1,
    })

    expect(purchase.actionCode).toBe('STATUS_CHANGED')
    expect(production.actionCode).toBe('STATUS_CHANGED')
  })
})

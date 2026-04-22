import { describe, expect, it } from 'vitest'
import type { NotificationRule, RuleSegment } from '../data/notification-rule-schema'
import {
  buildSegmentMetadata,
  getActiveRules,
  isSegmentStatusMatch,
} from './rule-matcher'
import type { RuleExecutionEvent } from './rule-execution-core'

function createRule(overrides: Partial<NotificationRule> = {}): NotificationRule {
  return {
    id: 'rule-1',
    name: '销售订单规则',
    enabled: true,
    entity: 'ORDER',
    sourceCode: 'SALES_ORDER',
    actionCode: 'STATUS_CHANGED',
    segments: [],
    createdAt: '2026-04-18T00:00:00.000Z',
    version: 1,
    ...overrides,
  }
}

function createSegment(overrides: Partial<RuleSegment> = {}): RuleSegment {
  return {
    id: 'segment-1',
    title: '待处理',
    targetStatuses: ['Pending'],
    commandIds: [],
    assigneeRoles: [],
    assigneeUsernames: [],
    resolveOnStatuses: ['Done'],
    dynamicRoleField: null,
    approval: {
      enabled: false,
      module: 'Trading',
      action: 'ORDER_REVIEW',
      approver1Id: '',
      approver2Id: '',
      dynamicApproverField: null,
      reasonTemplate: '',
    },
    ...overrides,
  }
}

describe('rule-matcher', () => {
  it('filters rules by source and action using the live event contract', () => {
    const event: RuleExecutionEvent = {
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: 'Pending',
    }

    const rules = [
      createRule({ id: 'rule-match' }),
      createRule({ id: 'rule-other-source', sourceCode: 'PURCHASE_ORDER' }),
      createRule({ id: 'rule-other-action', actionCode: 'CREATED' }),
      createRule({ id: 'rule-disabled', enabled: false }),
    ]

    const activeRules = getActiveRules({
      rules,
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      event,
    })

    expect(activeRules.map((rule) => rule.id)).toEqual(['rule-match'])
  })

  it('normalizes order identifiers into segment metadata for downstream executors', () => {
    const rule = createRule({ id: 'rule-2', name: '状态提醒' })
    const segment = createSegment({ id: 'segment-2', title: '正式下达' })
    const event: RuleExecutionEvent = {
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      targetStatus: 'InProgress',
      metadata: {
        id: 'order-123',
        orderNo: 'SO-001',
      },
    }

    const metadata = buildSegmentMetadata({
      rule,
      segment,
      event,
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
    })

    expect(metadata).toMatchObject({
      RuleId: 'rule-2',
      RuleName: '状态提醒',
      SegmentId: 'segment-2',
      SegmentTitle: '正式下达',
      SourceCode: 'SALES_ORDER',
      orderId: 'order-123',
      OrderId: 'order-123',
      orderNo: 'SO-001',
    })
  })

  it('matches status either by explicit targetStatuses or by empty catch-all segments', () => {
    const event: RuleExecutionEvent = {
      type: 'ORDER_EVENT',
      targetStatus: 'Pending',
    }

    expect(
      isSegmentStatusMatch({
        segment: createSegment({ targetStatuses: ['Pending'] }),
        event,
      })
    ).toBe(true)
    expect(
      isSegmentStatusMatch({
        segment: createSegment({ targetStatuses: [] }),
        event,
      })
    ).toBe(true)
    expect(
      isSegmentStatusMatch({
        segment: createSegment({ targetStatuses: ['Done'] }),
        event,
      })
    ).toBe(false)
  })
})

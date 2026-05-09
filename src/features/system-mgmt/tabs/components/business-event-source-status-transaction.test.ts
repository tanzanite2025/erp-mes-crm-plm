import { describe, expect, it } from 'vitest'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import {
  buildBusinessEventStatusAtomicTransactionPayload,
  isBusinessEventStatusAtomicTransactionSupported,
  replaceBusinessEventStatusAtomicTransactionRules,
} from './business-event-source-status-transaction'

function createSource(overrides?: Partial<BusinessEventSource>): BusinessEventSource {
  return {
    id: 'source-1',
    code: 'SALES_ORDER',
    name: '销售订单',
    module: 'Trading',
    entity: 'ORDER',
    enabled: true,
    description: '销售订单事件源',
    config: {
      actions: [],
      statuses: [
        { id: 'status-1', order: 0, code: 'Pending' },
        { id: 'status-2', order: 1, code: 'Done' },
      ],
      fields: [],
      dynamicResolvers: [],
      defaultActionUrlTemplate: '',
    },
    ...overrides,
  }
}

function createRule(overrides?: Partial<NotificationRule>): NotificationRule {
  return {
    id: 'rule-1',
    name: '销售订单待处理规则',
    enabled: true,
    entity: 'ORDER',
    sourceCode: 'SALES_ORDER',
    actionCode: 'STATUS_CHANGED',
    createdAt: '2026-05-09T00:00:00.000Z',
    version: 3,
    segments: [
      {
        id: 'segment-1',
        title: '待处理阶段',
        targetStatuses: ['Pending'],
        commandIds: [],
        assigneeGroups: [],
        assigneeUsernames: [],
        resolveOnStatuses: ['Done'],
        dynamicTargetField: null,
        approval: undefined,
      },
    ],
    ...overrides,
  }
}

describe('business-event-source-status-transaction', () => {
  it('accepts persisted-only status rename transactions', () => {
    const committedSource = createSource()
    const draftSource = createSource({
      config: {
        ...createSource().config,
        statuses: [
          { id: 'status-1', order: 0, code: 'Queued' },
          { id: 'status-2', order: 1, code: 'Done' },
        ],
      },
    })

    expect(
      isBusinessEventStatusAtomicTransactionSupported({
        draftSource,
        committedSource,
      })
    ).toBe(true)
  })

  it('rejects mixed rename with newly added statuses', () => {
    const committedSource = createSource()
    const draftSource = createSource({
      config: {
        ...createSource().config,
        statuses: [
          { id: 'status-1', order: 0, code: 'Queued' },
          { id: 'status-2', order: 1, code: 'Done' },
          { id: 'status-3', order: 2, code: 'Archived' },
        ],
      },
    })

    expect(
      isBusinessEventStatusAtomicTransactionSupported({
        draftSource,
        committedSource,
      })
    ).toBe(false)
  })

  it('builds atomic transaction payload from authoritative status fields', () => {
    const draftSource = createSource({
      updatedAt: '2026-05-09T00:00:00.000Z',
      config: {
        ...createSource().config,
        statuses: [
          { id: 'status-1', order: 0, code: 'Queued' },
          { id: 'status-2', order: 1, code: 'Done' },
        ],
      },
    })
    const changedRules = [createRule()]

    const payload = buildBusinessEventStatusAtomicTransactionPayload({
      draftSource,
      changedRules,
      previousRules: [createRule()],
      expectedUpdatedAt: '2026-05-09T00:00:00.000Z',
    })

    expect(payload).toEqual({
      expectedUpdatedAt: '2026-05-09T00:00:00.000Z',
      statuses: [
        { id: 'status-1', order: 0, code: 'Queued' },
        { id: 'status-2', order: 1, code: 'Done' },
      ],
      affectedRules: [{ ruleId: 'rule-1', expectedVersion: 3 }],
    })
  })

  it('replaces only rules returned by atomic transaction result', () => {
    const nextRules = replaceBusinessEventStatusAtomicTransactionRules(
      [createRule(), createRule({ id: 'rule-2', name: '已完成规则' })],
      [createRule({ segments: [{ ...createRule().segments[0]!, targetStatuses: ['Queued'] }] })]
    )

    expect(nextRules[0]?.segments[0]?.targetStatuses).toEqual(['Queued'])
    expect(nextRules[1]?.segments[0]?.targetStatuses).toEqual(['Pending'])
  })
})

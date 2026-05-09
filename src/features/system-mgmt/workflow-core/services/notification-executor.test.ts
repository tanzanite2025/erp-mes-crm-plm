import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationRule, RuleSegment } from '../data/notification-rule-schema'
import type { StandardCommand } from '../data/schema'
import {
  archiveResolvedMessages,
  executeNotificationAction,
} from './notification-executor'
import type { RuleExecutionEvent, RuleExecutionMetadata } from './rule-execution-core'

const {
  addMessageMock,
  hasMessageMock,
  getDismissedAtMock,
  archiveWhereMock,
  recordExecutionLogMock,
} = vi.hoisted(() => ({
  addMessageMock: vi.fn(),
  hasMessageMock: vi.fn(),
  getDismissedAtMock: vi.fn(),
  archiveWhereMock: vi.fn(),
  recordExecutionLogMock: vi.fn(),
}))

vi.mock('@/features/system-mgmt/notifications/notification-gateway', () => ({
  NotificationGateway: {
    addMessage: addMessageMock,
    hasMessage: hasMessageMock,
    getDismissedAt: getDismissedAtMock,
    archiveWhere: archiveWhereMock,
  },
}))

vi.mock('./execution-log-writer', () => ({
  recordExecutionLog: recordExecutionLogMock,
}))

function createRule(): NotificationRule {
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
  }
}

function createSegment(overrides: Partial<RuleSegment> = {}): RuleSegment {
  return {
    id: 'segment-1',
    title: '待处理',
    targetStatuses: ['Pending'],
    commandIds: ['cmd-1'],
    assigneeGroups: [],
    assigneeUsernames: [],
    resolveOnStatuses: ['Done'],
    dynamicTargetField: null,
    approval: undefined,
    ...overrides,
  }
}

function createCommand(): StandardCommand {
  return {
    id: 'cmd-1',
    actionType: 'NOTIFY',
    bindType: 'GLOBAL',
    title: '订单待处理',
    content: '订单 [OrderNo] 需要处理',
    targetLink: '/trading/orders/[OrderId]',
    sourceCode: '',
    actionCode: '',
    statusCodes: [],
    createdAt: '2026-04-18T00:00:00.000Z',
  }
}

function createEvent(): RuleExecutionEvent {
  return {
    type: 'ORDER_EVENT',
    action: 'STATUS_CHANGED',
    targetStatus: 'Pending',
    priority: 'info',
    actionUrl: '/trading/orders/order-1',
  }
}

function createMetadata(): RuleExecutionMetadata {
  return {
    OrderId: 'order-1',
    OrderNo: 'SO-001',
    SegmentId: 'segment-1',
  }
}

describe('notification-executor', () => {
  beforeEach(() => {
    addMessageMock.mockReset()
    hasMessageMock.mockReset()
    getDismissedAtMock.mockReset()
    archiveWhereMock.mockReset()
    recordExecutionLogMock.mockReset()
    hasMessageMock.mockReturnValue(false)
    getDismissedAtMock.mockReturnValue(undefined)
  })

  it('skips retroactive notifications when the same uniqueKey is already visible', () => {
    hasMessageMock.mockReturnValue(true)

    const result = executeNotificationAction({
      rule: createRule(),
      segment: createSegment(),
      event: createEvent(),
      eventKey: 'event-1',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalGroups: [],
      finalUsers: [],
      finalTargets: ['alice'],
      commands: [createCommand()],
      mode: 'retroactive',
      snoozeMs: 60_000,
    })

    expect(result).toEqual({
      notifiedCount: 0,
      skippedCount: 1,
    })
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  it('skips retroactive notifications during the snooze window after dismissal', () => {
    getDismissedAtMock.mockReturnValue(Date.now())

    const result = executeNotificationAction({
      rule: createRule(),
      segment: createSegment(),
      event: createEvent(),
      eventKey: 'event-2',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalGroups: [],
      finalUsers: [],
      finalTargets: ['alice'],
      commands: [createCommand()],
      mode: 'retroactive',
      snoozeMs: 60_000,
    })

    expect(result.skippedCount).toBe(1)
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  it('archives resolved messages by order and segment identity', () => {
    archiveResolvedMessages(
      { OrderId: 'order-9', SegmentId: 'segment-9' },
      'segment-9'
    )

    expect(archiveWhereMock).toHaveBeenCalledTimes(1)
    const predicate = archiveWhereMock.mock.calls[0]?.[0] as (
      message: { metadata?: Record<string, unknown> }
    ) => boolean

    expect(
      predicate({ metadata: { OrderId: 'order-9', SegmentId: 'segment-9' } })
    ).toBe(true)
    expect(
      predicate({ metadata: { OrderId: 'order-9', SegmentId: 'segment-x' } })
    ).toBe(false)
  })

  it('does not persist skipped logs when a bound template is missing', () => {
    const result = executeNotificationAction({
      rule: createRule(),
      segment: createSegment({ commandIds: ['missing-command'] }),
      event: createEvent(),
      eventKey: 'event-missing-template',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalGroups: [],
      finalUsers: [],
      finalTargets: ['alice'],
      commands: [createCommand()],
      mode: 'live',
      snoozeMs: 60_000,
    })

    expect(result).toEqual({
      notifiedCount: 0,
      skippedCount: 1,
    })
    expect(recordExecutionLogMock).not.toHaveBeenCalled()
  })

  it('does not persist skipped logs when no template and no fallback content are available', () => {
    const result = executeNotificationAction({
      rule: createRule(),
      segment: createSegment({ commandIds: [] }),
      event: {
        ...createEvent(),
        content: '',
      },
      eventKey: 'event-no-template-no-fallback',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalGroups: [],
      finalUsers: [],
      finalTargets: [],
      commands: [createCommand()],
      mode: 'live',
      snoozeMs: 60_000,
    })

    expect(result).toEqual({
      notifiedCount: 0,
      skippedCount: 1,
    })
    expect(recordExecutionLogMock).not.toHaveBeenCalled()
  })

  it('uses runtime event title instead of template title when sending notifications', () => {
    executeNotificationAction({
      rule: createRule(),
      segment: createSegment(),
      event: {
        ...createEvent(),
        title: '订单 [OrderNo] 状态提醒',
      },
      eventKey: 'event-3',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalGroups: [],
      finalUsers: [],
      finalTargets: ['alice'],
      commands: [createCommand()],
      mode: 'live',
      snoozeMs: 60_000,
    })

    expect(addMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '订单 SO-001 状态提醒',
      })
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  NotificationRule,
  RuleSegment,
} from '../data/notification-rule-schema'
import type { StandardCommand } from '../data/schema'
import { executeRoutingRules, type RuleExecutionEvent } from './rule-execution-core'

const {
  addMessageMock,
  hasMessageMock,
  getDismissedAtMock,
  archiveWhereMock,
  requestApprovalMock,
  recordExecutionLogMock,
} = vi.hoisted(() => ({
  addMessageMock: vi.fn(),
  hasMessageMock: vi.fn(),
  getDismissedAtMock: vi.fn(),
  archiveWhereMock: vi.fn(),
  requestApprovalMock: vi.fn(),
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

vi.mock('@/features/approval/services/approval-service', () => ({
  ApprovalService: {
    requestApproval: requestApprovalMock,
  },
}))

vi.mock('./execution-log-writer', () => ({
  recordExecutionLog: recordExecutionLogMock,
}))

function createSegment(overrides: Partial<RuleSegment> = {}): RuleSegment {
  return {
    id: 'segment-1',
    title: '待处理',
    targetStatuses: ['Pending'],
    commandIds: ['cmd-1'],
    assigneeRoles: [],
    assigneeUsernames: ['alice'],
    resolveOnStatuses: ['Done'],
    dynamicRoleField: null,
    approval: {
      enabled: true,
      module: 'Trading',
      action: 'ORDER_REVIEW',
      approver1Id: 'user-1',
      approver2Id: '',
      dynamicApproverField: null,
      reasonTemplate: '订单 [OrderNo] 需要审批',
    },
    ...overrides,
  }
}

function createRule(overrides: Partial<NotificationRule> = {}): NotificationRule {
  return {
    id: 'rule-1',
    name: '销售订单链路',
    enabled: true,
    entity: 'ORDER',
    sourceCode: 'SALES_ORDER',
    actionCode: 'STATUS_CHANGED',
    segments: [createSegment()],
    createdAt: '2026-04-18T00:00:00.000Z',
    version: 3,
    ...overrides,
  }
}

function createCommand(overrides: Partial<StandardCommand> = {}): StandardCommand {
  return {
    id: 'cmd-1',
    actionType: 'NOTIFY',
    bindType: 'GLOBAL',
    title: '订单待处理',
    content: '订单 [OrderNo] 需要处理',
    targetLink: '/trading/orders/[OrderId]',
    createdAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }
}

function createEvent(overrides: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent {
  return {
    type: 'ORDER_EVENT',
    action: 'STATUS_CHANGED',
    targetStatus: 'Pending',
    priority: 'info',
    actionUrl: '/trading/orders/order-1',
    sourceCode: 'SALES_ORDER',
    metadata: {
      id: 'order-1',
      orderId: 'order-1',
      OrderId: 'order-1',
      orderNo: 'SO-001',
      OrderNo: 'SO-001',
    },
    ...overrides,
  }
}

describe('rule-execution-core', () => {
  beforeEach(() => {
    addMessageMock.mockReset()
    hasMessageMock.mockReset()
    getDismissedAtMock.mockReset()
    archiveWhereMock.mockReset()
    requestApprovalMock.mockReset()
    recordExecutionLogMock.mockReset()
    hasMessageMock.mockReturnValue(false)
    getDismissedAtMock.mockReturnValue(undefined)
  })

  it('executes the full live chain for a matched rule: match + approval + notify', async () => {
    requestApprovalMock.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      module: 'Trading',
      action: 'ORDER_REVIEW',
      currentLevel: 1,
      approver1Id: 'user-1',
      approver2Id: '',
    })

    const result = await executeRoutingRules({
      rules: [createRule()],
      commands: [createCommand()],
      event: createEvent(),
      mode: 'live',
    })

    expect(result).toEqual({
      matchedCount: 1,
      notifiedCount: 1,
      approvalCreatedCount: 1,
      skippedNotificationCount: 0,
      skippedApprovalCount: 0,
      processedApprovalKeys: [],
    })
    expect(requestApprovalMock).toHaveBeenCalledWith({
      module: 'Trading',
      action: 'ORDER_REVIEW',
      targetId: 'order-1',
      reason: '订单 SO-001 需要审批',
      approver1Id: 'user-1',
      approver2Id: undefined,
    })
    expect(addMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ORDER_EVENT',
        title: '订单待处理',
        targetUsers: ['alice'],
        actionUrl: '/trading/orders/order-1',
        ruleId: 'rule-1',
        segmentId: 'segment-1',
      })
    )
    expect(recordExecutionLogMock).toHaveBeenCalledTimes(3)
    expect(
      recordExecutionLogMock.mock.calls.map((call) => call[0]?.executionType)
    ).toEqual(['match', 'approval', 'notify'])
  })

  it('aggregates retroactive dedupe results for both approval and notification', async () => {
    const processedApprovalKeys = new Set(['order-1_rule-1_segment-1_3_approval'])
    hasMessageMock.mockImplementation((predicate: (message: unknown) => boolean) =>
      predicate({
        metadata: { uniqueKey: 'order-1_segment-1_cmd-1' },
        isRead: false,
        isArchived: false,
      })
    )

    const result = await executeRoutingRules({
      rules: [createRule()],
      commands: [createCommand()],
      event: createEvent(),
      mode: 'retroactive',
      processedApprovalKeys,
    })

    expect(result).toEqual({
      matchedCount: 1,
      notifiedCount: 0,
      approvalCreatedCount: 0,
      skippedNotificationCount: 1,
      skippedApprovalCount: 1,
      processedApprovalKeys: [],
    })
    expect(requestApprovalMock).not.toHaveBeenCalled()
    expect(addMessageMock).not.toHaveBeenCalled()
    expect(recordExecutionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executionType: 'approval',
        executionStatus: 'skipped',
      })
    )
  })

  it('archives resolved messages before status mismatch short-circuits the segment', async () => {
    await executeRoutingRules({
      rules: [
        createRule({
          segments: [
            createSegment({
              targetStatuses: ['Pending'],
              resolveOnStatuses: ['Done'],
            }),
          ],
        }),
      ],
      commands: [createCommand()],
      event: createEvent({ targetStatus: 'Done' }),
      mode: 'live',
    })

    expect(archiveWhereMock).toHaveBeenCalledTimes(1)
    expect(addMessageMock).not.toHaveBeenCalled()
    expect(requestApprovalMock).not.toHaveBeenCalled()
    expect(recordExecutionLogMock).not.toHaveBeenCalled()
  })

  it('emits a consistent execution-log envelope for both live and retroactive runs', async () => {
    requestApprovalMock.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      module: 'Trading',
      action: 'ORDER_REVIEW',
      currentLevel: 1,
      approver1Id: 'user-1',
      approver2Id: '',
    })

    await executeRoutingRules({
      rules: [createRule()],
      commands: [createCommand()],
      event: createEvent(),
      mode: 'live',
    })

    const liveLogs = recordExecutionLogMock.mock.calls.map((call) => call[0])
    expect(new Set(liveLogs.map((log) => log.eventKey)).size).toBe(1)
    expect(liveLogs.map((log) => log.executionType)).toEqual([
      'match',
      'approval',
      'notify',
    ])

    for (const log of liveLogs) {
      expect(log).toEqual(
        expect.objectContaining({
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          ruleName: expect.any(String),
          segmentId: 'segment-1',
          segmentTitle: expect.any(String),
          metadata: expect.objectContaining({
            OrderId: 'order-1',
            orderId: 'order-1',
            RuleId: 'rule-1',
            SegmentId: 'segment-1',
            SourceCode: 'SALES_ORDER',
          }),
        })
      )
    }
    expect(liveLogs[0]?.result?.mode).toBe('live')
    expect(liveLogs[1]?.result?.approvalProcessKey).toBeTruthy()
    expect(liveLogs[2]?.result?.mode).toBe('live')

    recordExecutionLogMock.mockClear()

    await executeRoutingRules({
      rules: [createRule()],
      commands: [createCommand()],
      event: createEvent(),
      mode: 'retroactive',
      processedApprovalKeys: new Set<string>(),
    })

    const retroactiveLogs = recordExecutionLogMock.mock.calls.map(
      (call) => call[0]
    )
    expect(new Set(retroactiveLogs.map((log) => log.eventKey)).size).toBe(1)
    expect(retroactiveLogs.map((log) => log.executionType)).toEqual([
      'match',
      'approval',
      'notify',
    ])

    for (const log of retroactiveLogs) {
      expect(log).toEqual(
        expect.objectContaining({
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          segmentId: 'segment-1',
          metadata: expect.objectContaining({
            OrderId: 'order-1',
            orderId: 'order-1',
            RuleId: 'rule-1',
            SegmentId: 'segment-1',
            SourceCode: 'SALES_ORDER',
          }),
        })
      )
    }
    expect(retroactiveLogs[0]?.result?.mode).toBe('retroactive')
    expect(retroactiveLogs[1]?.result?.approvalProcessKey).toBeTruthy()
    expect(retroactiveLogs[2]?.result?.mode).toBe('retroactive')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationRule, RuleSegment } from '../data/notification-rule-schema'
import { executeApprovalAction } from './approval-executor'
import type { RuleExecutionEvent, RuleExecutionMetadata } from './rule-execution-core'

const { requestApprovalMock, recordExecutionLogMock } = vi.hoisted(() => ({
  requestApprovalMock: vi.fn(),
  recordExecutionLogMock: vi.fn(),
}))

vi.mock('@/features/approval/services/approval-service', () => ({
  ApprovalService: {
    requestApproval: requestApprovalMock,
  },
}))

vi.mock('./execution-log-writer', () => ({
  recordExecutionLog: recordExecutionLogMock,
}))

function createRule(): NotificationRule {
  return {
    id: 'rule-1',
    name: '销售订单待处理审批',
    enabled: true,
    entity: 'ORDER',
    sourceCode: 'SALES_ORDER',
    actionCode: 'STATUS_CHANGED',
    segments: [],
    createdAt: '2026-04-18T00:00:00.000Z',
    version: 3,
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

function createEvent(): RuleExecutionEvent {
  return {
    type: 'ORDER_EVENT',
    action: 'STATUS_CHANGED',
    targetStatus: 'Pending',
  }
}

function createMetadata(): RuleExecutionMetadata {
  return {
    OrderId: 'order-1',
    OrderNo: 'SO-001',
    targetId: 'order-1',
  }
}

describe('approval-executor', () => {
  beforeEach(() => {
    requestApprovalMock.mockReset()
    recordExecutionLogMock.mockReset()
  })

  it('skips retroactive approval creation when the same approval process key was already handled', async () => {
    const processedApprovalKeys = new Set(['order-1_rule-1_segment-1_3_approval'])

    const result = await executeApprovalAction({
      rule: createRule(),
      segment: createSegment(),
      event: createEvent(),
      eventKey: 'event-1',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalTargets: ['user-1'],
      mode: 'retroactive',
      processedApprovalKeys,
    })

    expect(result).toEqual({
      createdCount: 0,
      skippedCount: 1,
      processedApprovalKeys: [],
    })
    expect(requestApprovalMock).not.toHaveBeenCalled()
    expect(recordExecutionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executionType: 'approval',
        executionStatus: 'skipped',
      })
    )
  })

  it('creates approval and persists the processed key in retroactive mode', async () => {
    requestApprovalMock.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      module: 'Trading',
      action: 'ORDER_REVIEW',
      currentLevel: 1,
      approver1Id: 'user-1',
      approver2Id: '',
    })

    const processedApprovalKeys = new Set<string>()
    const result = await executeApprovalAction({
      rule: createRule(),
      segment: createSegment(),
      event: createEvent(),
      eventKey: 'event-2',
      targetEntity: 'ORDER',
      targetSourceCode: 'SALES_ORDER',
      metadata: createMetadata(),
      finalTargets: ['user-1'],
      mode: 'retroactive',
      processedApprovalKeys,
    })

    expect(requestApprovalMock).toHaveBeenCalledWith({
      module: 'Trading',
      action: 'ORDER_REVIEW',
      targetId: 'order-1',
      reason: '订单 SO-001 需要审批',
      approver1Id: 'user-1',
      approver2Id: undefined,
    })
    expect(result.createdCount).toBe(1)
    expect(result.skippedCount).toBe(0)
    expect(result.processedApprovalKeys).toEqual([
      'order-1_rule-1_segment-1_3_approval',
    ])
    expect(processedApprovalKeys.has('order-1_rule-1_segment-1_3_approval')).toBe(
      true
    )
  })
})

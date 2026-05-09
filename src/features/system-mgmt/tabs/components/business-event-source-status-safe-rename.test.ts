import { describe, expect, it } from 'vitest'
import { normalizeBusinessEventSource } from '../../workflow-core/data/business-event-source-normalizer'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import {
  analyzeBusinessEventStatusRenameBatch,
  analyzeBusinessEventStatusRenamePlans,
  applyBusinessEventStatusRenamesToRules,
  buildDerivedApprovalAction,
  collectBusinessEventStatusRenameDrafts,
} from './business-event-source-status-safe-rename'

function createSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'source-1',
  })
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
    version: 1,
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
        approval: {
          enabled: true,
          module: 'Trading',
          action: buildDerivedApprovalAction('SALES_ORDER', 'Pending'),
          approver1Id: '',
          approver2Id: '',
          dynamicApproverField: null,
          reasonTemplate: '',
        },
      },
    ],
    ...overrides,
  }
}

describe('business-event-source-status-safe-rename', () => {
  it('collects rename drafts by stable status id', () => {
    const committed = createSource()
    const draft = createSource()
    draft.config.statuses = draft.config.statuses.map((status) =>
      status.code === 'Pending' ? { ...status, code: 'Queued' } : status
    )

    expect(collectBusinessEventStatusRenameDrafts(committed, draft)).toEqual([
      {
        statusId: committed.config.statuses.find((status) => status.code === 'Pending')?.id,
        oldCode: 'Pending',
        nextCode: 'Queued',
      },
    ])
  })

  it('blocks rename when referenced target segment uses custom approval action', () => {
    const plans = analyzeBusinessEventStatusRenamePlans({
      sourceCode: 'SALES_ORDER',
      rules: [
        createRule({
          segments: [
            {
              ...createRule().segments[0]!,
              approval: {
                ...createRule().segments[0]!.approval!,
                action: 'CUSTOM_APPROVAL_ACTION',
              },
            },
          ],
        }),
      ],
      renameDrafts: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'Queued',
        },
      ],
    })

    expect(plans[0]).toMatchObject({
      canSafelyRename: false,
      targetSegmentCount: 1,
    })
    expect(plans[0]?.blockers[0]?.configuredAction).toBe('CUSTOM_APPROVAL_ACTION')
  })

  it('migrates targetStatuses, resolveOnStatuses and derived approval action together', () => {
    const result = applyBusinessEventStatusRenamesToRules({
      rules: [
        createRule({
          segments: [
            {
              ...createRule().segments[0]!,
              resolveOnStatuses: ['Pending', 'Done'],
            },
          ],
        }),
      ],
      sourceCode: 'SALES_ORDER',
      renamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'Queued',
          targetSegmentCount: 1,
          resolveSegmentCount: 1,
          derivedApprovalActionCount: 1,
          blockers: [],
          canSafelyRename: true,
        },
      ],
    })

    expect(result.changedRules).toHaveLength(1)
    expect(result.nextRules[0]?.segments[0]).toMatchObject({
      targetStatuses: ['Queued'],
      resolveOnStatuses: ['Queued', 'Done'],
      approval: {
        action: buildDerivedApprovalAction('SALES_ORDER', 'Queued'),
      },
    })
  })

  it('detects merge rename as batch blocker', () => {
    const analysis = analyzeBusinessEventStatusRenameBatch({
      sourceCode: 'SALES_ORDER',
      rules: [createRule()],
      renamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'HOLD',
          targetSegmentCount: 1,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 1,
          blockers: [],
          canSafelyRename: true,
        },
        {
          statusId: 'status-2',
          oldCode: 'Done',
          nextCode: 'HOLD',
          targetSegmentCount: 0,
          resolveSegmentCount: 1,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
      ],
    })

    expect(analysis.hasBlockers).toBe(true)
    expect(analysis.blockers[0]).toMatchObject({
      type: 'merge_rename',
      nextCode: 'HOLD',
    })
  })

  it('detects swap and chain rename as batch warnings', () => {
    const analysis = analyzeBusinessEventStatusRenameBatch({
      sourceCode: 'SALES_ORDER',
      rules: [createRule()],
      renamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'Queued',
          targetSegmentCount: 1,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 1,
          blockers: [],
          canSafelyRename: true,
        },
        {
          statusId: 'status-2',
          oldCode: 'Queued',
          nextCode: 'Pending',
          targetSegmentCount: 0,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
        {
          statusId: 'status-3',
          oldCode: 'Draft',
          nextCode: 'Review',
          targetSegmentCount: 0,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
        {
          statusId: 'status-4',
          oldCode: 'Review',
          nextCode: 'Approved',
          targetSegmentCount: 0,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
      ],
    })

    expect(analysis.hasWarnings).toBe(true)
    expect(analysis.swapPairs).toHaveLength(1)
    expect(analysis.chainPaths).toHaveLength(1)
  })

  it('detects semantic shrink when multiple statuses collapse in a rule array', () => {
    const analysis = analyzeBusinessEventStatusRenameBatch({
      sourceCode: 'SALES_ORDER',
      rules: [
        createRule({
          segments: [
            {
              ...createRule().segments[0]!,
              targetStatuses: ['Pending', 'Queued'],
              resolveOnStatuses: ['Pending', 'Queued', 'Done'],
            },
          ],
        }),
      ],
      renamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'HOLD',
          targetSegmentCount: 1,
          resolveSegmentCount: 1,
          derivedApprovalActionCount: 1,
          blockers: [],
          canSafelyRename: true,
        },
        {
          statusId: 'status-2',
          oldCode: 'Queued',
          nextCode: 'HOLD',
          targetSegmentCount: 1,
          resolveSegmentCount: 1,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
      ],
    })

    expect(analysis.semanticShrinkImpacts).toHaveLength(2)
    expect(analysis.semanticShrinkImpacts[0]?.afterValues).toContain('HOLD')
  })
})

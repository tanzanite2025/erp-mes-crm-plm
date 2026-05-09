import { describe, expect, it } from 'vitest'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import {
  buildBusinessEventStatusRollbackTargets,
  buildBusinessEventStatusRollbackFailureMessage,
  buildBusinessEventStatusRollbackSnapshots,
  replaceBusinessEventStatusRollbackRules,
} from './business-event-source-status-legacy-rollback'

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
          action: 'SALES_ORDER_Pending_APPROVAL',
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

describe('business-event-source-status-legacy-rollback', () => {
  it('builds rollback targets only for successfully migrated rules', () => {
    const previousRules = [createRule(), createRule({ id: 'rule-2', name: '已完成规则' })]
    const changedRules = [
      createRule({ segments: [{ ...createRule().segments[0]!, targetStatuses: ['Queued'] }] }),
      createRule({
        id: 'rule-2',
        name: '已完成规则',
        segments: [{ ...createRule().segments[0]!, targetStatuses: ['Closed'] }],
      }),
    ]

    const snapshots = buildBusinessEventStatusRollbackSnapshots({
      previousRules,
      changedRules,
    })
    const rollbackTargets = buildBusinessEventStatusRollbackTargets({
      snapshots,
      savedRules: [changedRules[0]!],
    })

    expect(rollbackTargets).toHaveLength(1)
    expect(rollbackTargets[0]?.id).toBe('rule-1')
    expect(rollbackTargets[0]?.segments[0]?.targetStatuses).toEqual(['Pending'])
  })

  it('replaces only affected rules in current state', () => {
    const previousRules = [createRule(), createRule({ id: 'rule-2', name: '已完成规则' })]
    const savedRules = [
      createRule({ segments: [{ ...createRule().segments[0]!, targetStatuses: ['Queued'] }] }),
    ]

    const nextRules = replaceBusinessEventStatusRollbackRules(previousRules, savedRules)

    expect(nextRules[0]?.segments[0]?.targetStatuses).toEqual(['Queued'])
    expect(nextRules[1]?.segments[0]?.targetStatuses).toEqual(['Pending'])
  })

  it('formats explicit rollback failure message', () => {
    const snapshots = buildBusinessEventStatusRollbackSnapshots({
      previousRules: [createRule()],
      changedRules: [
        createRule({ segments: [{ ...createRule().segments[0]!, targetStatuses: ['Queued'] }] }),
      ],
    })

    const message = buildBusinessEventStatusRollbackFailureMessage({
      phase: 'rollback',
      snapshots,
      savedRules: [createRule()],
      rollbackFailedRules: [createRule({ name: '销售订单待处理规则' })],
    })

    expect(message).toContain('状态迁移回滚失败')
    expect(message).toContain('销售订单待处理规则')
  })
})

import { describe, expect, it } from 'vitest'
import { normalizeBusinessEventSource } from '../../workflow-core/data/business-event-source-normalizer'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import { buildBusinessEventStatusReferenceMap } from './business-event-source-status-references'

function createSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'source-1',
  })
}

describe('business-event-source-status-references', () => {
  it('collects target, resolve and approval action references for statuses', () => {
    const source = createSource()
    const rules: NotificationRule[] = [
      {
        id: 'rule-1',
        name: '销售订单待处理',
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
      },
    ]

    const references = buildBusinessEventStatusReferenceMap(source, rules)

    expect(references.get('Pending')).toMatchObject({
      targetSegmentCount: 1,
      approvalActionCount: 1,
      referencedRuleCount: 1,
      isReferenced: true,
    })
    expect(references.get('Done')).toMatchObject({
      resolveSegmentCount: 1,
      isReferenced: true,
    })
    expect(references.get('Draft')).toMatchObject({
      isReferenced: false,
    })
  })
})

import { describe, expect, it } from 'vitest'
import { type RuleSegment } from '../../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../../workflow-core/data/schema'
import {
  buildStatusPreview,
  getSegmentCompleteness,
  joinBusinessList,
  type ResolverOption,
} from './rule-card-model'

const command: StandardCommand = {
  id: 'command-1',
  actionType: 'NOTIFY',
  bindType: 'GLOBAL',
  title: '订单待处理通知',
  content: '订单 [OrderNo] 待处理',
  targetLink: '/trading/orders/[OrderId]',
  params: ['OrderNo', 'OrderId'],
  sourceCode: '',
  actionCode: '',
  statusCodes: [],
  createdAt: '2026-04-20T00:00:00.000Z',
}

const resolverOptions: ResolverOption[] = [
  {
    id: 'resolver-created-by',
    code: 'createdBy',
    label: '创建人',
    path: 'createdBy',
    type: 'user',
    order: 1,
  },
]

function createSegment(
  overrides: Partial<RuleSegment> = {}
): RuleSegment {
  return {
    id: 'segment-1',
    title: '待处理',
    targetStatuses: ['Pending'],
    commandIds: [],
    assigneeGroups: [],
    assigneeUsernames: [],
    resolveOnStatuses: [],
    dynamicTargetField: null,
    approval: {
      enabled: false,
      module: 'Trading',
      action: 'SALES_ORDER_PENDING_APPROVAL',
      approver1Id: '',
      approver2Id: '',
      dynamicApproverField: null,
      reasonTemplate:
        '业务规则「[RuleName] / [SegmentTitle]」已命中，请审批单据 [OrderNo]。',
    },
    ...overrides,
  }
}

describe('rule-card-model', () => {
  it('summarizes disabled and incomplete segment states with stable Chinese labels', () => {
    expect(
      getSegmentCompleteness({
        segment: undefined,
        commands: [command],
        resolverOptions,
      })
    ).toEqual({ label: '未启用', tone: 'disabled' })

    expect(
      getSegmentCompleteness({
        segment: createSegment({
          approval: {
            enabled: true,
            module: 'Trading',
            action: 'SALES_ORDER_PENDING_APPROVAL',
            approver1Id: '',
            approver2Id: '',
            dynamicApproverField: null,
            reasonTemplate: '订单 [OrderNo] 需要审批',
          },
        }),
        commands: [command],
        resolverOptions,
      })
    ).toEqual({
      label: '缺通知对象 / 缺审批人 / 缺模板',
      tone: 'warning',
    })
  })

  it('marks a configured segment as runnable when notify target, approval target, and template are valid', () => {
    expect(
      getSegmentCompleteness({
        segment: createSegment({
          commandIds: ['command-1'],
          assigneeUsernames: ['Admin'],
          approval: {
            enabled: true,
            module: 'Trading',
            action: 'SALES_ORDER_PENDING_APPROVAL',
            approver1Id: 'user-1',
            approver2Id: '',
            dynamicApproverField: null,
            reasonTemplate: '订单 [OrderNo] 需要审批',
          },
        }),
        commands: [command],
        resolverOptions,
      })
    ).toEqual({ label: '可运行', tone: 'ready' })
  })

  it('builds business-readable status previews for notify and approval configuration', () => {
    expect(
      buildStatusPreview({
        sourceName: '采购订单',
        statusLabel: '待处理',
        enabled: true,
        notifyTargets: ['Admin', '动态：创建人'],
        commandTitle: '订单待处理通知',
        approvalTarget: '张三 / zhangsan',
      })
    ).toBe(
      '采购订单进入「待处理」时，通知 Admin、动态：创建人，使用「订单待处理通知」模板，并创建给 张三 / zhangsan 的审批。'
    )

    expect(
      buildStatusPreview({
        sourceName: '采购订单',
        statusLabel: '待处理',
        enabled: false,
        notifyTargets: [],
      })
    ).toBe('采购订单进入「待处理」时，当前不触发通知或审批。')
  })

  it('joins business labels with Chinese punctuation', () => {
    expect(joinBusinessList([])).toBe('')
    expect(joinBusinessList(['Admin'])).toBe('Admin')
    expect(joinBusinessList(['Admin', '张三', '创建人'])).toBe(
      'Admin、张三、创建人'
    )
  })
})

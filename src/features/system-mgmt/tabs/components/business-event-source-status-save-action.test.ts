import { describe, expect, it, vi, beforeEach } from 'vitest'

const { saveBusinessEventSourceSectionMock, commitStatusRenameTransactionMock } =
  vi.hoisted(() => ({
    saveBusinessEventSourceSectionMock: vi.fn(),
    commitStatusRenameTransactionMock: vi.fn(),
  }))

vi.mock('./business-event-source-card-actions', () => ({
  saveBusinessEventSourceSection: saveBusinessEventSourceSectionMock,
}))

vi.mock('../../workflow-core/services/routing-service', () => ({
  RoutingService: {
    commitEventSourceStatusRenameTransaction: commitStatusRenameTransactionMock,
  },
}))

import { saveBusinessEventSourceStatuses } from './business-event-source-status-save-action'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'

function createSource(overrides?: Partial<BusinessEventSource>): BusinessEventSource {
  return {
    id: 'source-1',
    code: 'SALES_ORDER',
    name: '销售订单',
    module: 'Trading',
    entity: 'ORDER',
    enabled: true,
    description: '销售订单事件源',
    updatedAt: '2026-05-09T00:00:00.000Z',
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
      },
    ],
    ...overrides,
  }
}

function createSavingSectionsSetter() {
  let current = {
    general: false,
    actions: false,
    statuses: false,
    fields: false,
    dynamicResolvers: false,
  }
  return vi.fn((updater) => {
    current = typeof updater === 'function' ? updater(current) : updater
    return current
  })
}

function createUndoPatchesSetter() {
  let current = {
    general: null,
    actions: null,
    statuses: null,
    fields: null,
    dynamicResolvers: null,
  }
  return vi.fn((updater) => {
    current = typeof updater === 'function' ? updater(current) : updater
    return current
  })
}

function createDraftSetter(initialDraft: BusinessEventSource) {
  let current = initialDraft
  return vi.fn((updater) => {
    current = typeof updater === 'function' ? updater(current) : updater
    return current
  })
}

function createRulesReplaceSetter(initialRules: NotificationRule[]) {
  let current = initialRules
  const setter = vi.fn((updater) => {
    current = typeof updater === 'function' ? updater(current) : updater
    return current
  })
  return {
    setter,
    read: () => current,
  }
}

beforeEach(() => {
  saveBusinessEventSourceSectionMock.mockReset()
  commitStatusRenameTransactionMock.mockReset()
})

describe('saveBusinessEventSourceStatuses', () => {
  it('blocks save when rename plan contains custom approval action blocker', async () => {
    const draft = createSource({
      config: {
        ...createSource().config,
        statuses: [
          { id: 'status-1', order: 0, code: 'Queued' },
          { id: 'status-2', order: 1, code: 'Done' },
        ],
      },
    })

    const result = await saveBusinessEventSourceStatuses({
      draft,
      committedSource: createSource(),
      committedSourceRef: { current: createSource() },
      rules: [createRule()],
      validationBySection: {
        general: [],
        actions: [],
        statuses: [],
        fields: [],
        dynamicResolvers: [],
      },
      statusRenamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'Queued',
          targetSegmentCount: 1,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 0,
          blockers: [
            {
              type: 'custom_approval_action',
              ruleId: 'rule-1',
              ruleName: '销售订单待处理规则',
              segmentId: 'segment-1',
              segmentTitle: '待处理阶段',
              configuredAction: 'CUSTOM_ACTION',
            },
          ],
          canSafelyRename: false,
        },
      ],
      statusRenameBatchAnalysis: {
        blockers: [],
        swapPairs: [],
        chainPaths: [],
        semanticShrinkImpacts: [],
        hasBlockers: false,
        hasWarnings: false,
      },
      setSavingSections: createSavingSectionsSetter(),
      setCommittedSourceState: vi.fn(),
      setUndoPatches: createUndoPatchesSetter(),
      setDraft: createDraftSetter(draft),
      onRulesReplace: createRulesReplaceSetter([createRule()]).setter,
      onUpdate: vi.fn(),
      onSourceReplace: vi.fn(),
      mergeIncomingDraft: vi.fn((_o, saved) => saved),
    })

    expect(result).toBeUndefined()
    expect(commitStatusRenameTransactionMock).not.toHaveBeenCalled()
    expect(saveBusinessEventSourceSectionMock).not.toHaveBeenCalled()
  })

  it('falls back to generic section save when there is no rename', async () => {
    const draft = createSource()
    saveBusinessEventSourceSectionMock.mockResolvedValue(draft)

    const result = await saveBusinessEventSourceStatuses({
      draft,
      committedSource: createSource(),
      committedSourceRef: { current: createSource() },
      rules: [createRule()],
      validationBySection: {
        general: [],
        actions: [],
        statuses: [],
        fields: [],
        dynamicResolvers: [],
      },
      statusRenamePlans: [],
      statusRenameBatchAnalysis: {
        blockers: [],
        swapPairs: [],
        chainPaths: [],
        semanticShrinkImpacts: [],
        hasBlockers: false,
        hasWarnings: false,
      },
      setSavingSections: createSavingSectionsSetter(),
      setCommittedSourceState: vi.fn(),
      setUndoPatches: createUndoPatchesSetter(),
      setDraft: createDraftSetter(draft),
      onRulesReplace: createRulesReplaceSetter([createRule()]).setter,
      onUpdate: vi.fn(),
      onSourceReplace: vi.fn(),
      mergeIncomingDraft: vi.fn((_o, saved) => saved),
    })

    expect(result).toBe(draft)
    expect(saveBusinessEventSourceSectionMock).toHaveBeenCalledTimes(1)
    expect(commitStatusRenameTransactionMock).not.toHaveBeenCalled()
  })

  it('commits atomic transaction and reconciles source and rules on success', async () => {
    const committedSource = createSource()
    const draft = createSource({
      config: {
        ...createSource().config,
        statuses: [
          { id: 'status-1', order: 0, code: 'Queued' },
          { id: 'status-2', order: 1, code: 'Done' },
        ],
      },
    })
    const updatedRule = createRule({
      version: 4,
      segments: [
        {
          ...createRule().segments[0]!,
          targetStatuses: ['Queued'],
        },
      ],
    })
    const onSourceReplace = vi.fn()
    const setCommittedSourceState = vi.fn()
    const rulesState = createRulesReplaceSetter([createRule(), createRule({ id: 'rule-2' })])

    commitStatusRenameTransactionMock.mockResolvedValue({
      eventSource: draft,
      rules: [updatedRule],
      summary: {
        renamedStatusCount: 1,
        affectedRuleCount: 1,
        targetSegmentCount: 1,
        resolveSegmentCount: 0,
        derivedApprovalActionCount: 0,
      },
    })

    const result = await saveBusinessEventSourceStatuses({
      draft,
      committedSource,
      committedSourceRef: { current: committedSource },
      rules: [createRule(), createRule({ id: 'rule-2' })],
      validationBySection: {
        general: [],
        actions: [],
        statuses: [],
        fields: [],
        dynamicResolvers: [],
      },
      statusRenamePlans: [
        {
          statusId: 'status-1',
          oldCode: 'Pending',
          nextCode: 'Queued',
          targetSegmentCount: 1,
          resolveSegmentCount: 0,
          derivedApprovalActionCount: 0,
          blockers: [],
          canSafelyRename: true,
        },
      ],
      statusRenameBatchAnalysis: {
        blockers: [],
        swapPairs: [],
        chainPaths: [],
        semanticShrinkImpacts: [],
        hasBlockers: false,
        hasWarnings: false,
      },
      setSavingSections: createSavingSectionsSetter(),
      setCommittedSourceState,
      setUndoPatches: createUndoPatchesSetter(),
      setDraft: createDraftSetter(draft),
      onRulesReplace: rulesState.setter,
      onUpdate: vi.fn(),
      onSourceReplace,
      mergeIncomingDraft: vi.fn((_o, saved) => saved),
    })

    expect(result).toEqual(draft)
    expect(commitStatusRenameTransactionMock).toHaveBeenCalledTimes(1)
    expect(onSourceReplace).toHaveBeenCalledWith(draft)
    expect(setCommittedSourceState).toHaveBeenCalledWith(draft)
    expect(rulesState.read()[0]?.segments[0]?.targetStatuses).toEqual(['Queued'])
    expect(rulesState.read()[1]?.id).toBe('rule-2')
  })
})

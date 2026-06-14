import { type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import { RoutingService } from '../../workflow-core/services/routing-service'
import {
  saveBusinessEventSourceSection,
  type UndoPatchState,
} from './business-event-source-card-actions'
import {
  applyBusinessEventSourceSectionPatch,
  buildBusinessEventSourceSectionPatch,
  extractBusinessEventSourceSectionPatch,
  type BusinessEventSourceSection,
} from './business-event-source-card-diff'
import { type BusinessEventSourceCardSavingState } from './business-event-source-card-state'
import { cloneBusinessEventSource } from './business-event-source-card-utils'
import {
  applyBusinessEventStatusRenamesToRules,
  type BusinessEventStatusRenameBatchAnalysis,
  type BusinessEventStatusRenamePlan,
} from './business-event-source-status-safe-rename'
import {
  buildBusinessEventStatusAtomicTransactionPayload,
  isBusinessEventStatusAtomicTransactionSupported,
  replaceBusinessEventStatusAtomicTransactionRules,
} from './business-event-source-status-transaction'

type SavingState = BusinessEventSourceCardSavingState

interface SaveBusinessEventSourceStatusesOptions {
  draft: BusinessEventSource
  committedSource: BusinessEventSource
  committedSourceRef: { current: BusinessEventSource }
  rules: NotificationRule[]
  validationBySection: Record<BusinessEventSourceSection, string[]>
  statusRenamePlans: BusinessEventStatusRenamePlan[]
  statusRenameBatchAnalysis: BusinessEventStatusRenameBatchAnalysis
  setSavingSections: Dispatch<SetStateAction<SavingState>>
  setCommittedSourceState: (nextSource: BusinessEventSource) => void
  setUndoPatches: Dispatch<SetStateAction<UndoPatchState>>
  setDraft: Dispatch<SetStateAction<BusinessEventSource>>
  onRulesReplace: Dispatch<SetStateAction<NotificationRule[]>>
  onUpdate: (
    id: string,
    updates: Partial<BusinessEventSource>
  ) => Promise<BusinessEventSource | undefined>
  onSourceReplace: (source: BusinessEventSource) => void
  mergeIncomingDraft: (
    optimisticCommitted: BusinessEventSource,
    normalizedSaved: BusinessEventSource,
    currentDraft: BusinessEventSource
  ) => BusinessEventSource
}

function getBusinessEventStatusRenamePlanBlockerMessage(
  renamePlans: BusinessEventStatusRenamePlan[]
) {
  const blockingPlan = renamePlans.find((plan) => !plan.canSafelyRename)
  if (!blockingPlan) {
    return null
  }

  const firstBlocker = blockingPlan.blockers[0]
  return firstBlocker
    ? `状态 ${blockingPlan.oldCode} 无法安全改名：规则「${firstBlocker.ruleName} / ${firstBlocker.segmentTitle}」使用了自定义审批动作 ${firstBlocker.configuredAction}`
    : `状态 ${blockingPlan.oldCode} 无法安全改名`
}

function getBusinessEventStatusRenameBatchBlockerMessage(
  batchAnalysis: BusinessEventStatusRenameBatchAnalysis
) {
  if (!batchAnalysis.hasBlockers) {
    return null
  }

  const firstBlocker = batchAnalysis.blockers[0]
  if (firstBlocker?.type === 'merge_rename') {
    return `批量改名被阻断：状态 ${firstBlocker.codes.join(' / ')} 将汇聚到 ${firstBlocker.nextCode}`
  }

  return `批量改名被阻断：检测到重命名闭环 ${firstBlocker?.codes.join(' -> ')}`
}

export async function saveBusinessEventSourceStatuses({
  draft,
  committedSource,
  committedSourceRef,
  rules,
  validationBySection,
  statusRenamePlans,
  statusRenameBatchAnalysis,
  setSavingSections,
  setCommittedSourceState,
  setUndoPatches,
  setDraft,
  onRulesReplace,
  onUpdate,
  onSourceReplace,
  mergeIncomingDraft,
}: SaveBusinessEventSourceStatusesOptions) {
  if (validationBySection.statuses.length > 0) {
    toast.error(validationBySection.statuses[0])
    return undefined
  }

  const renamePlans = statusRenamePlans.filter(
    (plan) => plan.oldCode !== plan.nextCode
  )
  const planBlockerMessage =
    getBusinessEventStatusRenamePlanBlockerMessage(renamePlans)
  if (planBlockerMessage) {
    toast.error(planBlockerMessage)
    return undefined
  }

  const batchBlockerMessage = getBusinessEventStatusRenameBatchBlockerMessage(
    statusRenameBatchAnalysis
  )
  if (batchBlockerMessage) {
    toast.error(batchBlockerMessage)
    return undefined
  }

  if (renamePlans.length === 0) {
    return saveBusinessEventSourceSection({
      section: 'statuses',
      draft,
      validationBySection,
      setSavingSections,
      setCommittedSourceState,
      setUndoPatches,
      setDraft,
      committedSourceRef,
      onUpdate,
      mergeIncomingDraft,
    })
  }

  if (
    !isBusinessEventStatusAtomicTransactionSupported({
      draftSource: draft,
      committedSource,
    })
  ) {
    toast.error(
      '当前后端原子事务仅支持已落库状态安全改名，不支持与新增或删除状态混合提交'
    )
    return undefined
  }

  const migration = applyBusinessEventStatusRenamesToRules({
    rules,
    sourceCode: committedSource.code,
    renamePlans,
  })

  const previousRules = rules
  const previousCommitted = committedSourceRef.current
  const patch = buildBusinessEventSourceSectionPatch(
    previousCommitted,
    draft,
    'statuses'
  )
  const optimisticCommitted = cloneBusinessEventSource(
    applyBusinessEventSourceSectionPatch(previousCommitted, patch)
  )

  try {
    setSavingSections((prev) => ({ ...prev, statuses: true }))
    setCommittedSourceState(optimisticCommitted)
    setUndoPatches((prev) => ({
      ...prev,
      statuses: extractBusinessEventSourceSectionPatch(
        previousCommitted,
        'statuses'
      ),
    }))

    const result =
      await RoutingService.commitEventSourceStatusRenameTransaction(
        draft.id,
        buildBusinessEventStatusAtomicTransactionPayload({
          draftSource: draft,
          changedRules: migration.changedRules,
          previousRules,
          expectedUpdatedAt: previousCommitted.updatedAt,
        })
      )

    setSavingSections((prev) => ({ ...prev, statuses: false }))
    setCommittedSourceState(result.eventSource)
    onSourceReplace(result.eventSource)
    setDraft((currentDraft) =>
      mergeIncomingDraft(optimisticCommitted, result.eventSource, currentDraft)
    )
    onRulesReplace((currentRules) =>
      replaceBusinessEventStatusAtomicTransactionRules(
        currentRules,
        result.rules
      )
    )
    toast.success('状态已通过后端原子事务安全改名，并同步提交规则引用')
    return result.eventSource
  } catch (error) {
    setSavingSections((prev) => ({ ...prev, statuses: false }))
    setCommittedSourceState(previousCommitted)
    setUndoPatches((prev) => ({ ...prev, statuses: null }))
    toast.error(
      error instanceof Error ? error.message : '状态安全重命名原子事务失败'
    )
    return undefined
  }
}

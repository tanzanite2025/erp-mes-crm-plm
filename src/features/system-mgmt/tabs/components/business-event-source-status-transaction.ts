import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { toBusinessEventStatusAuthoritativeSnapshot } from '../../workflow-core/data/business-event-status-contract'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import { type BusinessEventStatusRenameTransactionPayload } from '../../workflow-core/services/routing-service'

export function isBusinessEventStatusAtomicTransactionSupported({
  draftSource,
  committedSource,
}: {
  draftSource: BusinessEventSource
  committedSource: BusinessEventSource
}) {
  return (
    draftSource.config.statuses.length ===
      committedSource.config.statuses.length &&
    draftSource.config.statuses.every(
      (status) =>
        !!status.id &&
        committedSource.config.statuses.some(
          (committedStatus) => committedStatus.id === status.id
        )
    )
  )
}

export function buildBusinessEventStatusAtomicTransactionPayload({
  draftSource,
  changedRules,
  previousRules,
  expectedUpdatedAt,
}: {
  draftSource: BusinessEventSource
  changedRules: NotificationRule[]
  previousRules: NotificationRule[]
  expectedUpdatedAt?: string
}): BusinessEventStatusRenameTransactionPayload {
  return {
    expectedUpdatedAt,
    statuses: draftSource.config.statuses.map((status, index) =>
      toBusinessEventStatusAuthoritativeSnapshot(status, index)
    ),
    affectedRules: changedRules.map((rule) => ({
      ruleId: rule.id,
      expectedVersion:
        previousRules.find((currentRule) => currentRule.id === rule.id)
          ?.version ?? rule.version,
    })),
  }
}

export function replaceBusinessEventStatusAtomicTransactionRules(
  baseRules: NotificationRule[],
  nextRules: NotificationRule[]
) {
  const nextRuleMap = new Map(nextRules.map((rule) => [rule.id, rule]))
  return baseRules.map((rule) => nextRuleMap.get(rule.id) ?? rule)
}

import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'

export interface BusinessEventStatusRollbackRuleSnapshot {
  ruleId: string
  ruleName: string
  beforeRule: NotificationRule
  afterRule: NotificationRule
}

export type BusinessEventStatusRollbackPhase =
  | 'rule_migration'
  | 'source_save'
  | 'rollback'

function dedupeRuleNames(ruleNames: string[]) {
  return Array.from(new Set(ruleNames))
}

export function buildBusinessEventStatusRollbackSnapshots({
  previousRules,
  changedRules,
}: {
  previousRules: NotificationRule[]
  changedRules: NotificationRule[]
}) {
  return changedRules.flatMap((changedRule) => {
    const beforeRule = previousRules.find((rule) => rule.id === changedRule.id)
    if (!beforeRule) {
      return []
    }

    return [
      {
        ruleId: changedRule.id,
        ruleName: changedRule.name,
        beforeRule,
        afterRule: changedRule,
      } satisfies BusinessEventStatusRollbackRuleSnapshot,
    ]
  })
}

export function replaceBusinessEventStatusRollbackRules(
  baseRules: NotificationRule[],
  nextRules: NotificationRule[]
) {
  const nextRuleMap = new Map(nextRules.map((rule) => [rule.id, rule]))
  return baseRules.map((rule) => nextRuleMap.get(rule.id) ?? rule)
}

export function buildBusinessEventStatusRollbackTargets({
  snapshots,
  savedRules,
}: {
  snapshots: BusinessEventStatusRollbackRuleSnapshot[]
  savedRules: NotificationRule[]
}) {
  const savedRuleIds = new Set(savedRules.map((rule) => rule.id))
  return snapshots
    .filter((snapshot) => savedRuleIds.has(snapshot.ruleId))
    .map((snapshot) => snapshot.beforeRule)
}

export function buildBusinessEventStatusRollbackFailureMessage({
  phase,
  snapshots,
  savedRules,
  rollbackFailedRules,
}: {
  phase: BusinessEventStatusRollbackPhase
  snapshots: BusinessEventStatusRollbackRuleSnapshot[]
  savedRules: NotificationRule[]
  rollbackFailedRules?: NotificationRule[]
}) {
  const impactedRuleNames = dedupeRuleNames(snapshots.map((snapshot) => snapshot.ruleName))
  const migratedRuleNames = dedupeRuleNames(savedRules.map((rule) => rule.name))
  const rollbackFailedRuleNames = dedupeRuleNames(
    rollbackFailedRules?.map((rule) => rule.name) ?? []
  )

  if (phase === 'rule_migration') {
    return `规则迁移阶段失败。已涉及规则：${impactedRuleNames.join('、') || '无'}`
  }

  if (phase === 'source_save') {
    return `事件源保存失败，规则迁移已回滚。受影响规则：${migratedRuleNames.join('、') || '无'}`
  }

  return `状态迁移回滚失败。已迁移规则：${migratedRuleNames.join('、') || '无'}；未完全回滚规则：${rollbackFailedRuleNames.join('、') || migratedRuleNames.join('、') || '无'}`
}

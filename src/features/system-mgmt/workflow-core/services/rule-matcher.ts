import {
  type NotificationRule,
  type RuleSegment,
} from '../data/notification-rule-schema'
import {
  type RuleExecutionEvent,
  type RuleExecutionMetadata,
} from './rule-execution-core'

export function getActiveRules({
  rules,
  targetEntity,
  targetSourceCode,
  event,
}: {
  rules: NotificationRule[]
  targetEntity: string
  targetSourceCode: string
  event: RuleExecutionEvent
}) {
  return rules.filter((rule) => {
    if (!rule.enabled) return false
    const matchesSource = rule.sourceCode
      ? rule.sourceCode === targetSourceCode
      : rule.entity === targetEntity
    const matchesAction =
      !rule.actionCode || !event.action || rule.actionCode === event.action
    return matchesSource && matchesAction
  })
}

export function buildSegmentMetadata({
  rule,
  segment,
  event,
  targetEntity,
  targetSourceCode,
}: {
  rule: NotificationRule
  segment: RuleSegment
  event: RuleExecutionEvent
  targetEntity: string
  targetSourceCode: string
}): RuleExecutionMetadata {
  const metadata: RuleExecutionMetadata = {
    ...event.metadata,
    RuleId: rule.id,
    RuleName: rule.name,
    SourceCode: targetSourceCode,
    SegmentId: segment.id,
    SegmentTitle: segment.title,
  }

  if (targetEntity === 'ORDER') {
    const orderId =
      metadata.OrderId || metadata.orderId || metadata.id || event.metadata?.id
    if (orderId) {
      metadata.OrderId = orderId
      metadata.orderId = orderId
    }
  }

  return metadata
}

export function isSegmentStatusMatch({
  segment,
  event,
}: {
  segment: RuleSegment
  event: RuleExecutionEvent
}) {
  return (
    segment.targetStatuses.length === 0 ||
    Boolean(
      event.targetStatus && segment.targetStatuses.includes(event.targetStatus)
    )
  )
}

import {
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import {
  type NotificationRule,
  type RuleSegment,
} from '../../workflow-core/data/notification-rule-schema'

export interface BusinessEventStatusReferenceSummary {
  code: string
  targetSegmentCount: number
  resolveSegmentCount: number
  approvalActionCount: number
  referencedRuleCount: number
  referencedRuleNames: string[]
  referencedSegmentTitles: string[]
  isReferenced: boolean
}

function createEmptyStatusReferenceSummary(
  status: Pick<BusinessStatus, 'code'>
): BusinessEventStatusReferenceSummary {
  return {
    code: status.code,
    targetSegmentCount: 0,
    resolveSegmentCount: 0,
    approvalActionCount: 0,
    referencedRuleCount: 0,
    referencedRuleNames: [],
    referencedSegmentTitles: [],
    isReferenced: false,
  }
}

function collectSegmentStatusReference(
  summary: BusinessEventStatusReferenceSummary,
  rule: Pick<NotificationRule, 'id' | 'name'>,
  segment: Pick<RuleSegment, 'title'>,
  referenceType: 'target' | 'resolve' | 'approvalAction'
) {
  if (referenceType === 'target') {
    summary.targetSegmentCount += 1
  }
  if (referenceType === 'resolve') {
    summary.resolveSegmentCount += 1
  }
  if (referenceType === 'approvalAction') {
    summary.approvalActionCount += 1
  }

  if (!summary.referencedRuleNames.includes(rule.name)) {
    summary.referencedRuleNames.push(rule.name)
  }
  if (!summary.referencedSegmentTitles.includes(segment.title)) {
    summary.referencedSegmentTitles.push(segment.title)
  }
}

export function buildBusinessEventStatusReferenceMap(
  source: Pick<BusinessEventSource, 'code' | 'config'>,
  rules: NotificationRule[]
) {
  const summaries = new Map<string, BusinessEventStatusReferenceSummary>()
  const sourceRules = rules.filter((rule) => rule.sourceCode === source.code)

  source.config.statuses.forEach((status) => {
    summaries.set(status.code, createEmptyStatusReferenceSummary(status))
  })

  sourceRules.forEach((rule) => {
    rule.segments.forEach((segment) => {
      segment.targetStatuses.forEach((statusCode) => {
        const summary = summaries.get(statusCode)
        if (!summary) return
        collectSegmentStatusReference(summary, rule, segment, 'target')
      })
      ;(segment.resolveOnStatuses ?? []).forEach((statusCode) => {
        const summary = summaries.get(statusCode)
        if (!summary) return
        collectSegmentStatusReference(summary, rule, segment, 'resolve')
      })

      source.config.statuses.forEach((status) => {
        const summary = summaries.get(status.code)
        if (!summary) return
        if (
          segment.approval?.action === `${source.code}_${status.code}_APPROVAL`
        ) {
          collectSegmentStatusReference(
            summary,
            rule,
            segment,
            'approvalAction'
          )
        }
      })
    })
  })

  summaries.forEach((summary) => {
    summary.referencedRuleCount = summary.referencedRuleNames.length
    summary.isReferenced =
      summary.targetSegmentCount > 0 ||
      summary.resolveSegmentCount > 0 ||
      summary.approvalActionCount > 0
  })

  return summaries
}

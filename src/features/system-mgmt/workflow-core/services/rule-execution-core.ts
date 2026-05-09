import {
  type NotificationPriority,
  type NotificationType,
} from '@/features/system-mgmt/notifications/types'
import { type NotificationRule } from '../data/notification-rule-schema'
import { type StandardCommand } from '../data/schema'
import { executeApprovalAction } from './approval-executor'
import { executeNotificationAction, archiveResolvedMessages } from './notification-executor'
import {
  buildExecutionEventKey,
  getTargetEntity,
  getTargetSourceCode,
  resolveSegmentTargets,
  resolveTemplate,
} from './target-resolver'
import {
  buildSegmentMetadata,
  getActiveRules,
  isSegmentStatusMatch,
} from './rule-matcher'

export type RuleExecutionMetadata = Record<string, unknown>
export type RuleExecutionMode = 'live' | 'retroactive'

export interface RuleExecutionEvent {
  type: NotificationType
  action?: string
  targetStatus?: string
  title?: string
  content?: string
  priority?: NotificationPriority
  targetGroups?: string[]
  targetUsers?: string[]
  actionUrl?: string
  sourceCode?: string
  metadata?: RuleExecutionMetadata
}

export interface RuleExecutionContext {
  rules: NotificationRule[]
  commands: StandardCommand[]
  event: RuleExecutionEvent
  mode?: RuleExecutionMode
  processedApprovalKeys?: Set<string>
  snoozeMs?: number
}

export interface RuleExecutionResult {
  matchedCount: number
  notifiedCount: number
  approvalCreatedCount: number
  skippedNotificationCount: number
  skippedApprovalCount: number
  processedApprovalKeys: string[]
}

export { resolveTemplate }

export async function executeRoutingRules({
  rules,
  commands,
  event,
  mode = 'live',
  processedApprovalKeys = new Set<string>(),
  snoozeMs = 60_000,
}: RuleExecutionContext): Promise<RuleExecutionResult> {
  const result: RuleExecutionResult = {
    matchedCount: 0,
    notifiedCount: 0,
    approvalCreatedCount: 0,
    skippedNotificationCount: 0,
    skippedApprovalCount: 0,
    processedApprovalKeys: [],
  }

  if (!rules || rules.length === 0) return result

  const targetEntity = getTargetEntity(event.type)
  const targetSourceCode = getTargetSourceCode(event)
  const activeRules = getActiveRules({
    rules,
    targetEntity,
    targetSourceCode,
    event,
  })

  for (const rule of activeRules) {
    for (const segment of rule.segments) {
      const metadata = buildSegmentMetadata({
        rule,
        segment,
        event,
        targetEntity,
        targetSourceCode,
      })

      if (
        event.targetStatus &&
        segment.resolveOnStatuses?.includes(event.targetStatus)
      ) {
        archiveResolvedMessages(metadata, segment.id)
      }

      if (!isSegmentStatusMatch({ segment, event })) continue

      const { finalGroups, finalUsers, finalTargets } = resolveSegmentTargets({
        assigneeGroups: segment.assigneeGroups,
        assigneeUsernames: segment.assigneeUsernames,
        dynamicTargetField: segment.dynamicTargetField,
        event,
      })
      const eventKey = buildExecutionEventKey(
        event.type,
        targetSourceCode,
        rule.id,
        segment.id,
        metadata
      )

      result.matchedCount += 1

      const approvalResult = await executeApprovalAction({
        rule,
        segment,
        event,
        eventKey,
        targetEntity,
        targetSourceCode,
        metadata,
        finalTargets,
        mode,
        processedApprovalKeys,
      })
      result.approvalCreatedCount += approvalResult.createdCount
      result.skippedApprovalCount += approvalResult.skippedCount
      result.processedApprovalKeys.push(
        ...approvalResult.processedApprovalKeys
      )

      const notificationResult = executeNotificationAction({
        rule,
        segment,
        event,
        eventKey,
        targetEntity,
        targetSourceCode,
        metadata,
        finalGroups,
        finalUsers,
        finalTargets,
        commands,
        mode,
        snoozeMs,
      })
      result.notifiedCount += notificationResult.notifiedCount
      result.skippedNotificationCount += notificationResult.skippedCount
    }
  }

  return result
}

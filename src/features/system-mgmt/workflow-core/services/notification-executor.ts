import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import {
  type NotificationRule,
  type RuleSegment,
} from '../data/notification-rule-schema'
import { type StandardCommand } from '../data/schema'
import {
  type RuleExecutionEvent,
  type RuleExecutionMetadata,
  type RuleExecutionMode,
} from './rule-execution-core'
import { recordExecutionLog } from './execution-log-writer'
import {
  buildBusinessKey,
  getMetadataRecord,
  getMetadataString,
  resolveTemplate,
} from './target-resolver'

export interface NotificationExecutionInput {
  rule: NotificationRule
  segment: RuleSegment
  event: RuleExecutionEvent
  eventKey: string
  targetEntity: string
  targetSourceCode: string
  metadata: RuleExecutionMetadata
  finalGroups: string[]
  finalUsers: string[]
  finalTargets: string[]
  commands: StandardCommand[]
  mode: RuleExecutionMode
  snoozeMs: number
}

export interface NotificationExecutionResult {
  notifiedCount: number
  skippedCount: number
}

const MISSING_TEMPLATE_ERROR =
  '当前规则未绑定通知内容模板，系统也没有可用的默认通知正文。'

function shouldSkipRetroactiveNotification(uniqueKey: string, snoozeMs: number) {
  const isAlreadyVisible = NotificationGateway.hasMessage((message) => {
    const metadata = getMetadataRecord(message.metadata)
    return (
      getMetadataString(metadata, 'uniqueKey') === uniqueKey &&
      !message.isRead &&
      !message.isArchived
    )
  })
  if (isAlreadyVisible) return true

  const lastDismissed = NotificationGateway.getDismissedAt(uniqueKey)
  return Boolean(lastDismissed && Date.now() - lastDismissed < snoozeMs)
}

export function archiveResolvedMessages(
  metadata: RuleExecutionMetadata,
  segmentId: string
) {
  const orderId =
    getMetadataString(metadata, 'orderId') ||
    getMetadataString(metadata, 'OrderId') ||
    getMetadataString(metadata, 'id')
  if (!orderId) return

  NotificationGateway.archiveWhere((message) => {
    const messageMetadata = getMetadataRecord(message.metadata)
    return (
      getMetadataString(messageMetadata, 'OrderId') === orderId &&
      getMetadataString(messageMetadata, 'SegmentId') === segmentId
    )
  })
}

export function executeNotificationAction({
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
}: NotificationExecutionInput): NotificationExecutionResult {
  const result: NotificationExecutionResult = {
    notifiedCount: 0,
    skippedCount: 0,
  }

  if (segment.commandIds.length > 0) {
    for (const commandId of segment.commandIds) {
      const command = commands.find((item) => item.id === commandId)
      const uniqueKey = `${buildBusinessKey(metadata)}_${segment.id}_${commandId}`

      if (!command) {
        recordExecutionLog({
          eventKey,
          entity: targetEntity,
          sourceCode: targetSourceCode,
          actionCode: event.action || 'STATUS_CHANGED',
          statusCode: event.targetStatus,
          ruleId: rule.id,
          ruleName: rule.name,
          segmentId: segment.id,
          segmentTitle: segment.title,
          executionType: 'notify',
          executionStatus: 'skipped',
          commandId,
          targets: finalTargets,
          metadata,
          errorMessage: `当前规则绑定的通知内容模板不存在：${commandId}`,
        })
        continue
      }

      if (
        mode === 'retroactive' &&
        shouldSkipRetroactiveNotification(uniqueKey, snoozeMs)
      ) {
        result.skippedCount += 1
        continue
      }

      const resolvedContent = resolveTemplate(command.content, metadata)
      const resolvedActionUrl = command.targetLink
        ? resolveTemplate(command.targetLink, metadata)
        : event.actionUrl

      try {
        NotificationGateway.addMessage({
          type: event.type,
          title: command.title,
          content: resolvedContent,
          priority: event.priority || 'info',
          targetGroups: finalGroups.length > 0 ? finalGroups : undefined,
          targetUsers: finalUsers.length > 0 ? finalUsers : event.targetUsers,
          actionUrl: resolvedActionUrl,
          metadata: { ...metadata, uniqueKey, commandId: command.id },
          ruleId: rule.id,
          segmentId: segment.id,
          commandId,
        })
        result.notifiedCount += 1
        recordExecutionLog({
          eventKey,
          entity: targetEntity,
          sourceCode: targetSourceCode,
          actionCode: event.action || 'STATUS_CHANGED',
          statusCode: event.targetStatus,
          ruleId: rule.id,
          ruleName: rule.name,
          segmentId: segment.id,
          segmentTitle: segment.title,
          executionType: 'notify',
          executionStatus: 'success',
          commandId: command.id,
          title: command.title,
          content: resolvedContent,
          actionUrl: resolvedActionUrl,
          targets: finalTargets,
          metadata: { ...metadata, uniqueKey, commandId: command.id },
          result: {
            uniqueKey,
            fallback: false,
            targetCount: finalTargets.length,
            mode,
          },
        })
      } catch (error) {
        recordExecutionLog({
          eventKey,
          entity: targetEntity,
          sourceCode: targetSourceCode,
          actionCode: event.action || 'STATUS_CHANGED',
          statusCode: event.targetStatus,
          ruleId: rule.id,
          ruleName: rule.name,
          segmentId: segment.id,
          segmentTitle: segment.title,
          executionType: 'notify',
          executionStatus: 'failed',
          commandId: command.id,
          title: command.title,
          content: resolvedContent,
          actionUrl: resolvedActionUrl,
          targets: finalTargets,
          metadata: { ...metadata, uniqueKey, commandId: command.id },
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return result
  }

  if (!event.content && finalTargets.length === 0) {
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'notify',
      executionStatus: 'skipped',
      targets: finalTargets,
      metadata,
      errorMessage: MISSING_TEMPLATE_ERROR,
    })
    return result
  }

  const uniqueKey = `${buildBusinessKey(metadata)}_${segment.id}_fallback`
  if (
    mode === 'retroactive' &&
    shouldSkipRetroactiveNotification(uniqueKey, snoozeMs)
  ) {
    result.skippedCount += 1
    return result
  }

  const fallbackContent =
    event.content ||
    `业务状态已进入「${event.targetStatus || segment.title}」，请及时处理。`
  try {
    NotificationGateway.addMessage({
      type: event.type,
      title: event.title || segment.title,
      content: fallbackContent,
      priority: event.priority || 'info',
      targetGroups: finalGroups.length > 0 ? finalGroups : undefined,
      targetUsers: finalUsers.length > 0 ? finalUsers : event.targetUsers,
      actionUrl: event.actionUrl,
      metadata: { ...metadata, uniqueKey },
      ruleId: rule.id,
      segmentId: segment.id,
    })
    result.notifiedCount += 1
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'notify',
      executionStatus: 'success',
      title: event.title || segment.title,
      content: fallbackContent,
      actionUrl: event.actionUrl,
      targets: finalTargets,
      metadata: { ...metadata, uniqueKey },
      result: {
        uniqueKey,
        fallback: true,
        targetCount: finalTargets.length,
        mode,
      },
    })
  } catch (error) {
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'notify',
      executionStatus: 'failed',
      title: event.title || segment.title,
      content: fallbackContent,
      actionUrl: event.actionUrl,
      targets: finalTargets,
      metadata: { ...metadata, uniqueKey },
      errorMessage: error instanceof Error ? error.message : String(error),
    })
  }

  return result
}

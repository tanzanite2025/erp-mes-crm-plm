import { type SystemMessage } from '@/features/system-mgmt/notifications/types'
import {
  BUSINESS_EVENT_SOURCE_TEMPLATES,
  getBusinessEventSourceCodesByNotificationType,
} from '../data/business-event-source-templates'
import { type NotificationRule } from '../data/notification-rule-schema'
import {
  type RuleExecutionEvent,
  type RuleExecutionMetadata,
} from './rule-execution-core'

export function getMetadataRecord(
  metadata: SystemMessage['metadata'] | undefined
): RuleExecutionMetadata {
  return metadata && typeof metadata === 'object' ? metadata : {}
}

export function getMetadataString(
  metadata: RuleExecutionMetadata,
  key: string
): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function getNestedManager(metadata: RuleExecutionMetadata): string | undefined {
  const approval = metadata.approval
  if (!approval || typeof approval !== 'object') return undefined
  const manager = (approval as Record<string, unknown>).manager
  return typeof manager === 'string' ? manager : undefined
}

export function getMetadataByPath(
  metadata: RuleExecutionMetadata,
  path: string
): string | undefined {
  if (!path) return undefined
  const value = path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, metadata)
  return typeof value === 'string' ? value : undefined
}

export function resolveDynamicAssignee(
  metadata: RuleExecutionMetadata,
  field: string | null | undefined
): string | undefined {
  if (!field) return undefined

  const fieldMap: Record<string, () => string | undefined> = {
    claimedBy: () => getMetadataString(metadata, 'claimedBy'),
    createdBy: () => getMetadataString(metadata, 'createdBy'),
    'approval.manager': () => getNestedManager(metadata),
  }

  return fieldMap[field]?.() || getMetadataByPath(metadata, field)
}

export function resolveApprovalTargetId(
  metadata: RuleExecutionMetadata
): string | undefined {
  return (
    getMetadataString(metadata, 'targetId') ||
    getMetadataString(metadata, 'TargetId') ||
    getMetadataString(metadata, 'orderId') ||
    getMetadataString(metadata, 'OrderId') ||
    getMetadataString(metadata, 'id')
  )
}

export function resolveApprovalChain(
  approver1Id: string | undefined,
  approver2Id: string | undefined,
  dynamicApproverId: string | undefined
) {
  let effectiveApprover1Id = approver1Id?.trim() || ''
  let effectiveApprover2Id = approver2Id?.trim() || ''
  const resolvedDynamicApproverId = dynamicApproverId?.trim() || ''

  if (!effectiveApprover1Id && resolvedDynamicApproverId) {
    effectiveApprover1Id = resolvedDynamicApproverId
  } else if (
    effectiveApprover1Id &&
    !effectiveApprover2Id &&
    resolvedDynamicApproverId &&
    resolvedDynamicApproverId !== effectiveApprover1Id
  ) {
    effectiveApprover2Id = resolvedDynamicApproverId
  }

  if (!effectiveApprover1Id && effectiveApprover2Id) {
    effectiveApprover1Id = effectiveApprover2Id
    effectiveApprover2Id = ''
  }

  if (effectiveApprover1Id && effectiveApprover1Id === effectiveApprover2Id) {
    effectiveApprover2Id = ''
  }

  return {
    effectiveApprover1Id,
    effectiveApprover2Id,
  }
}

export function buildBusinessKey(metadata: RuleExecutionMetadata) {
  return (
    getMetadataString(metadata, 'orderId') ||
    getMetadataString(metadata, 'OrderId') ||
    getMetadataString(metadata, 'id') ||
    getMetadataString(metadata, 'orderNo') ||
    getMetadataString(metadata, 'OrderNo') ||
    'system'
  )
}

/**
 * 事件键 - 稳定标识（sourceCode + type + businessKey + ruleId + segmentId）。
 * 同一事件再次执行时返回相同的 eventKey，便于按事件查询所有相关日志。
 *
 * 每次执行的唯一标识请使用 buildExecutionId（写入 log.result.executionId）。
 */
export function buildExecutionEventKey(
  type: RuleExecutionEvent['type'],
  sourceCode: string,
  ruleId: string,
  segmentId: string,
  metadata: RuleExecutionMetadata
): string {
  return [
    sourceCode,
    type,
    buildBusinessKey(metadata),
    ruleId || 'rule',
    segmentId || 'segment',
  ].join('_')
}

/**
 * 单次执行的唯一标识。每次执行都会生成新的 id，写入 log.result.executionId。
 */
export function buildExecutionId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildApprovalProcessKey(
  rule: NotificationRule,
  segmentId: string,
  metadata: RuleExecutionMetadata
) {
  return [
    buildBusinessKey(metadata),
    rule.id || 'rule',
    segmentId || 'segment',
    rule.version ?? 1,
    'approval',
  ].join('_')
}

export function resolveTemplate(
  template: string,
  metadata: RuleExecutionMetadata = {}
) {
  if (!template) return ''
  return template.replace(/\[(\w+)\]/g, (match, key) => {
    return metadata[key] !== undefined ? String(metadata[key]) : match
  })
}

/**
 * 通过 NotificationType 推断目标实体（ORDER / QUALITY / ...）。
 * 实体定义来自 BUSINESS_EVENT_SOURCE_TEMPLATES — 取第一个匹配模板的 entity。
 * 兜底返回 'ORDER' 是为了向后兼容。
 */
export function getTargetEntity(type: RuleExecutionEvent['type']) {
  const matchingTemplate = BUSINESS_EVENT_SOURCE_TEMPLATES.find(
    (template) => template.meta.notificationType === type
  )
  return matchingTemplate?.entity ?? 'ORDER'
}

/**
 * 通过事件推断目标 sourceCode。
 * 优先级：event.sourceCode > metadata.sourceCode > 通过 NotificationType 反查的第一个模板 > 'SALES_ORDER'
 */
export function getTargetSourceCode(event: RuleExecutionEvent) {
  if (event.sourceCode) return event.sourceCode

  const metadataSourceCode = getMetadataString(event.metadata || {}, 'sourceCode')
  if (metadataSourceCode) return metadataSourceCode

  const candidateCodes = getBusinessEventSourceCodesByNotificationType(event.type)
  return candidateCodes[0] ?? 'SALES_ORDER'
}

export function resolveSegmentTargets({
  assigneeGroups,
  assigneeUsernames,
  dynamicTargetField,
  event,
}: {
  assigneeGroups: string[]
  assigneeUsernames: string[]
  dynamicTargetField?: string | null
  event: RuleExecutionEvent
}) {
  const dynamicTargets: string[] = []
  const resolved = resolveDynamicAssignee(
    event.metadata || {},
    dynamicTargetField
  )
  if (resolved) dynamicTargets.push(resolved)

  const finalGroups = event.targetGroups || [
    ...new Set([...assigneeGroups, ...dynamicTargets]),
  ]
  const finalUsers = [
    ...new Set([...(assigneeUsernames ?? []), ...dynamicTargets]),
  ]

  return {
    dynamicTargets,
    finalGroups,
    finalUsers,
    finalTargets: [...finalGroups, ...finalUsers],
  }
}

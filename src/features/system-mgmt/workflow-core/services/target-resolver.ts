import { type SystemMessage } from '@/features/system-mgmt/notifications/types'
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
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8),
  ].join('_')
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

export function getTargetEntity(type: RuleExecutionEvent['type']) {
  const entityTypeMap: Record<string, string> = {
    ORDER_EVENT: 'ORDER',
    QUALITY_ALERT: 'PRODUCT',
    EQUIPMENT_STATUS: 'MOLD',
    SYSTEM_NOTICE: 'SYSTEM',
    TASK_ASSIGNED: 'SYSTEM',
  }
  return entityTypeMap[type] || 'ORDER'
}

export function getTargetSourceCode(event: RuleExecutionEvent) {
  const sourceTypeMap: Record<string, string> = {
    ORDER_EVENT: 'SALES_ORDER',
    QUALITY_ALERT: 'QUALITY_ALERT',
    EQUIPMENT_STATUS: 'EQUIPMENT_STATUS',
    SYSTEM_NOTICE: 'SYSTEM_NOTICE',
    TASK_ASSIGNED: 'PRODUCTION_TASK',
  }
  return (
    event.sourceCode ||
    getMetadataString(event.metadata || {}, 'sourceCode') ||
    sourceTypeMap[event.type] ||
    'SALES_ORDER'
  )
}

export function resolveSegmentTargets({
  assigneeRoles,
  assigneeUsernames,
  dynamicRoleField,
  event,
}: {
  assigneeRoles: string[]
  assigneeUsernames: string[]
  dynamicRoleField?: string | null
  event: RuleExecutionEvent
}) {
  const dynamicTargets: string[] = []
  const resolved = resolveDynamicAssignee(
    event.metadata || {},
    dynamicRoleField
  )
  if (resolved) dynamicTargets.push(resolved)

  const finalRoles = event.targetRoles || [
    ...new Set([...assigneeRoles, ...dynamicTargets]),
  ]
  const finalUsers = [
    ...new Set([...(assigneeUsernames ?? []), ...dynamicTargets]),
  ]

  return {
    dynamicTargets,
    finalRoles,
    finalUsers,
    finalTargets: [...finalRoles, ...finalUsers],
  }
}

import type { NotificationType } from '@/features/system-mgmt/notifications/types'
import { normalizeQualityStandardStatus } from '../utils/quality-utils'
import type { Standard } from '../data/schema'

export const QUALITY_STANDARD_SOURCE_CODE = 'QUALITY_STANDARD'
export const QUALITY_STANDARD_NOTIFICATION_TYPE: NotificationType =
  'QUALITY_STANDARD_EVENT'

export type QualityStandardRoutingSemanticAction =
  | 'CREATED'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'

interface BuildQualityStandardRoutingEventInput {
  standard: Standard
  semanticAction: QualityStandardRoutingSemanticAction
  previousStatus?: Standard['status']
}

function buildQualityStandardRoutingTitle(
  standard: Standard,
  semanticAction: QualityStandardRoutingSemanticAction
) {
  const actionLabelMap: Record<QualityStandardRoutingSemanticAction, string> = {
    CREATED: '已创建',
    SUBMITTED_FOR_APPROVAL: '已提交审批',
    APPROVED: '已审批通过',
    REJECTED: '已驳回',
    PUBLISHED: '已发布',
    ARCHIVED: '已归档',
  }

  return `品质标准 ${standard.code || standard.name || standard.id} ${actionLabelMap[semanticAction]}`
}

function buildQualityStandardRoutingContent(
  standard: Standard,
  semanticAction: QualityStandardRoutingSemanticAction
) {
  const normalizedStatus = normalizeQualityStandardStatus(standard.status)
  const semanticLabelMap: Record<QualityStandardRoutingSemanticAction, string> = {
    CREATED: '标准已创建并进入受控域。',
    SUBMITTED_FOR_APPROVAL: '标准已进入待审核阶段，请按规则链处理审批。',
    APPROVED: '标准审批已完成，可继续进入发布链路。',
    REJECTED: '标准已被驳回，请根据驳回原因修订。',
    PUBLISHED: '标准已发布，可供执行链引用。',
    ARCHIVED: '标准已归档，仅保留追溯与审计能力。',
  }

  return `${standard.name || standard.code || standard.id} 当前状态：${normalizedStatus}。${semanticLabelMap[semanticAction]}`
}

function buildQualityStandardRoutingMetadata(
  standard: Standard,
  semanticAction: QualityStandardRoutingSemanticAction,
  previousStatus?: Standard['status']
) {
  const normalizedStatus = normalizeQualityStandardStatus(standard.status)
  const normalizedPreviousStatus = previousStatus
    ? normalizeQualityStandardStatus(previousStatus)
    : undefined

  return {
    id: standard.id,
    targetId: standard.id,
    standardId: standard.id,
    StandardId: standard.id,
    code: standard.code,
    standardCode: standard.code,
    StandardCode: standard.code,
    name: standard.name,
    standardName: standard.name,
    StandardName: standard.name,
    type: standard.type,
    StandardType: standard.type,
    version: standard.version,
    Version: standard.version,
    status: normalizedStatus,
    Status: normalizedStatus,
    previousStatus: normalizedPreviousStatus,
    PreviousStatus: normalizedPreviousStatus,
    semanticAction,
    SemanticAction: semanticAction,
    operator: standard.operator,
    Operator: standard.operator,
    auditor: standard.auditor,
    Auditor: standard.auditor,
    auditTime: standard.auditTime,
    AuditTime: standard.auditTime,
    reviewComment: standard.reviewComment,
    ReviewComment: standard.reviewComment,
    rejectReason: standard.rejectReason,
    RejectReason: standard.rejectReason,
    archiveReason: standard.archiveReason,
    ArchiveReason: standard.archiveReason,
    publishedBy: standard.publishedBy,
    PublishedBy: standard.publishedBy,
    publishedAt: standard.publishedAt,
    PublishedAt: standard.publishedAt,
    archivedBy: standard.archivedBy,
    ArchivedBy: standard.archivedBy,
    archivedAt: standard.archivedAt,
    ArchivedAt: standard.archivedAt,
    sourceCode: QUALITY_STANDARD_SOURCE_CODE,
  }
}

export function buildQualityStandardRoutingEvent({
  standard,
  semanticAction,
  previousStatus,
}: BuildQualityStandardRoutingEventInput) {
  return {
    type: QUALITY_STANDARD_NOTIFICATION_TYPE,
    action: semanticAction === 'CREATED' ? 'CREATED' : 'STATUS_CHANGED',
    sourceCode: QUALITY_STANDARD_SOURCE_CODE,
    targetStatus: normalizeQualityStandardStatus(standard.status),
    title: buildQualityStandardRoutingTitle(standard, semanticAction),
    content: buildQualityStandardRoutingContent(standard, semanticAction),
    actionUrl: `/quality/standards/${standard.id}/preview`,
    metadata: buildQualityStandardRoutingMetadata(
      standard,
      semanticAction,
      previousStatus
    ),
  }
}

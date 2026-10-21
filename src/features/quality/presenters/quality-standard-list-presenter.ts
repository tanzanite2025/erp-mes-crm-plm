import type { useLanguage } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import {
  formatQualityActorName,
  formatQualityDateTime,
  getQualityAuditMeta,
  getQualityStandardTypeLabel,
  getStatusMeta,
  isQualityStandardEditable,
  normalizeQualityStandardStatus,
} from '../utils/quality-utils'

interface QualityStandardListPresenterContext {
  t: ReturnType<typeof useLanguage>['t']
  locale: string
}

export interface QualityStandardListItemPresenter {
  source: Standard
  id: string
  code: string
  name: string
  versionText: string
  typeLabel: string
  statusMeta: ReturnType<typeof getStatusMeta>
  auditMeta: ReturnType<typeof getQualityAuditMeta>
  hasApprovalRequest: boolean
  approvalRequestLabel: string
  approvalRequestClassName: string
  operatorName: string
  operateTimeText: string
  reviewerName?: string
  decisionSummary?: string
  decisionReason?: string
  decisionActor?: string
  decisionTimestampText?: string
  processSummaryLabel?: string
  processSummaryClassName?: string
  processSummaryHint?: string
  canEdit: boolean
}

function buildProcessSummaryLabel(locale: string, standard: Standard) {
  const summary = standard.approvalRequestSummary
  if (!summary) {
    return undefined
  }

  if (summary.status === 'PENDING') {
    return locale === 'zh-CN' ? '审批请求待处理' : 'Approval Pending'
  }

  if (summary.status === 'APPROVED_L1') {
    return locale === 'zh-CN' ? '一级审批通过' : 'L1 Approved'
  }

  if (summary.status === 'APPROVED') {
    return locale === 'zh-CN' ? '审批请求通过' : 'Approval Approved'
  }

  if (summary.status === 'REJECTED') {
    return locale === 'zh-CN' ? '审批请求驳回' : 'Approval Rejected'
  }

  if (summary.status === 'EXPIRED') {
    return locale === 'zh-CN' ? '审批请求过期' : 'Approval Expired'
  }

  return locale === 'zh-CN' ? '审批请求已消费' : 'Approval Consumed'
}

function buildProcessSummaryClassName(standard: Standard) {
  const summary = standard.approvalRequestSummary
  if (!summary) {
    return undefined
  }

  if (summary.status === 'APPROVED' || summary.status === 'CONSUMED') {
    return 'bg-emerald-500/10 text-emerald-600'
  }

  if (summary.status === 'REJECTED' || summary.status === 'EXPIRED') {
    return 'bg-rose-500/10 text-rose-600'
  }

  if (summary.status === 'PENDING' || summary.status === 'APPROVED_L1') {
    return 'bg-amber-500/10 text-amber-600'
  }

  return 'bg-slate-500/10 text-slate-500'
}

function buildProcessSummaryHint(standard: Standard) {
  const summary = standard.approvalRequestSummary
  if (!summary) {
    return undefined
  }

  return summary.reason?.trim() || `${summary.module} / ${summary.action}`
}

function buildQualityStandardApprovalRequestLabel(
  locale: string,
  hasApprovalRequest: boolean
) {
  if (hasApprovalRequest) {
    return locale === 'zh-CN' ? '已生成审批申请' : 'Approval Request Created'
  }

  return locale === 'zh-CN' ? '未生成审批申请' : 'No Approval Request'
}

function buildQualityStandardApprovalRequestClassName(
  hasApprovalRequest: boolean
) {
  return hasApprovalRequest
    ? 'bg-emerald-500/10 text-emerald-600'
    : 'bg-slate-500/10 text-slate-500'
}

function buildDecisionSummary(locale: string, status: Standard['status']) {
  const normalizedStatus = normalizeQualityStandardStatus(status)

  if (normalizedStatus === 'REJECTED') {
    return locale === 'zh-CN' ? '已驳回' : 'Rejected'
  }

  if (normalizedStatus === 'ARCHIVED') {
    return locale === 'zh-CN' ? '已归档' : 'Archived'
  }

  if (normalizedStatus === 'PUBLISHED') {
    return locale === 'zh-CN' ? '已发布' : 'Published'
  }

  if (normalizedStatus === 'APPROVED') {
    return locale === 'zh-CN' ? '已审批' : 'Approved'
  }

  if (normalizedStatus === 'PENDING_APPROVAL') {
    return locale === 'zh-CN' ? '待审核' : 'Pending Review'
  }

  return undefined
}

function buildDecisionReason(standard: Standard) {
  return (
    standard.rejectReason?.trim() ||
    standard.archiveReason?.trim() ||
    standard.reviewComment?.trim() ||
    undefined
  )
}

function buildDecisionActor(standard: Standard) {
  return (
    formatQualityActorName(standard.archivedBy) ||
    formatQualityActorName(standard.publishedBy) ||
    formatQualityActorName(standard.auditor) ||
    undefined
  )
}

function buildDecisionTimestamp(standard: Standard) {
  return (
    formatQualityDateTime(standard.archivedAt) ||
    formatQualityDateTime(standard.publishedAt) ||
    formatQualityDateTime(standard.auditTime) ||
    undefined
  )
}

export function buildQualityStandardListItemPresenter(
  standard: Standard,
  { t, locale }: QualityStandardListPresenterContext
): QualityStandardListItemPresenter {
  const hasApprovalRequest = Boolean(standard.approvalRequestSummary?.id)
  const hasReviewDecision = [
    'APPROVED',
    'REJECTED',
    'PUBLISHED',
    'ARCHIVED',
  ].includes(normalizeQualityStandardStatus(standard.status))
  const operatorName =
    formatQualityActorName(standard.operator) || t('quality.common.system')

  return {
    source: standard,
    id: standard.id,
    code: standard.code,
    name: standard.name,
    versionText: `VER ${standard.version?.toFixed(1) || '1.0'}`,
    typeLabel: getQualityStandardTypeLabel(t, standard.type),
    statusMeta: getStatusMeta(t, standard.status),
    auditMeta: getQualityAuditMeta(locale, standard.status, standard.auditor),
    hasApprovalRequest,
    approvalRequestLabel: buildQualityStandardApprovalRequestLabel(
      locale,
      hasApprovalRequest
    ),
    approvalRequestClassName:
      buildQualityStandardApprovalRequestClassName(hasApprovalRequest),
    operatorName,
    operateTimeText: formatQualityDateTime(standard.operateTime) || '-',
    reviewerName: hasReviewDecision
      ? formatQualityActorName(standard.auditor)
      : undefined,
    decisionSummary: buildDecisionSummary(locale, standard.status),
    decisionReason: buildDecisionReason(standard),
    decisionActor: hasReviewDecision ? buildDecisionActor(standard) : undefined,
    decisionTimestampText: hasReviewDecision
      ? buildDecisionTimestamp(standard)
      : undefined,
    processSummaryLabel: buildProcessSummaryLabel(locale, standard),
    processSummaryClassName: buildProcessSummaryClassName(standard),
    processSummaryHint: buildProcessSummaryHint(standard),
    canEdit: isQualityStandardEditable(standard.status),
  }
}

export function buildQualityStandardListPresenter(
  standards: Standard[],
  context: QualityStandardListPresenterContext
) {
  return standards.map((standard) =>
    buildQualityStandardListItemPresenter(standard, context)
  )
}

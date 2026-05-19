import type { useLanguage } from '@/context/language-provider'
import { auditUtils } from '@/lib/audit-utils'

export type QualityStandardNormalizedType = 'IQC' | 'IPQC' | 'FQC' | 'OQC'

export type QualityStandardNormalizedStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'

export function normalizeQualityStandardType(type?: string | null): QualityStandardNormalizedType {
    const normalized = type?.toUpperCase()
    if (type === '巡检' || normalized === 'IPQC') return 'IPQC'
    if (type === '首检' || normalized === 'FQC') return 'FQC'
    if (type === '出货检验' || normalized === 'OQC') return 'OQC'
    return 'IQC'
}

export function getQualityStandardTypeLabel(
    t: ReturnType<typeof useLanguage>['t'],
    type?: string | null
) {
    const normalized = normalizeQualityStandardType(type)
    if (normalized === 'IPQC') return t('quality.standards.values.typeInProcess')
    if (normalized === 'FQC') return t('quality.standards.values.typeFirstPiece')
    if (normalized === 'OQC') return t('quality.standards.values.typeOutgoing')
    return t('quality.standards.values.typeIncoming')
}

export function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string | null) {
    return getQualityStandardTypeLabel(t, type)
}

export function normalizeQualityStandardStatus(status?: string | null): QualityStandardNormalizedStatus {
    const normalized = status?.toUpperCase()

    if (status === '草稿' || normalized === 'DRAFT') return 'DRAFT'
    if (status === '待审核' || normalized === 'PENDING_APPROVAL' || normalized === 'PENDING') {
        return 'PENDING_APPROVAL'
    }
    if (status === '审批通过' || normalized === 'APPROVED') return 'APPROVED'
    if (status === '已驳回' || normalized === 'REJECTED') return 'REJECTED'
    if (status === '已归档' || normalized === 'ARCHIVED') return 'ARCHIVED'
    return 'PUBLISHED'
}

export function getQualityStandardStatusLabel(
    t: ReturnType<typeof useLanguage>['t'],
    status?: string | null
) {
    const normalized = normalizeQualityStandardStatus(status)

    if (normalized === 'DRAFT') return t('quality.standards.values.statusDraft')
    if (normalized === 'PENDING_APPROVAL') return t('quality.standards.values.statusPendingApproval')
    if (normalized === 'APPROVED') return t('quality.standards.values.statusApproved')
    if (normalized === 'REJECTED') return t('quality.standards.values.statusRejected')
    if (normalized === 'ARCHIVED') return t('quality.standards.values.statusArchived')
    return t('quality.standards.values.statusPublished')
}

export function getQualityStandardAvailableActions(status?: string | null) {
    const normalized = normalizeQualityStandardStatus(status)

    return {
        canEdit: normalized === 'DRAFT' || normalized === 'REJECTED',
        canSubmitForApproval: normalized === 'DRAFT' || normalized === 'REJECTED',
        canApprove: normalized === 'PENDING_APPROVAL',
        canReject: normalized === 'PENDING_APPROVAL',
        canPublish: normalized === 'APPROVED',
        canArchive: normalized === 'PUBLISHED',
        isReadOnly: normalized !== 'DRAFT' && normalized !== 'REJECTED',
    }
}

export function isQualityStandardEditable(status?: string | null) {
    return getQualityStandardAvailableActions(status).canEdit
}

export function getStatusMeta(t: ReturnType<typeof useLanguage>['t'], status?: string | null) {
    const normalized = normalizeQualityStandardStatus(status)

    if (normalized === 'DRAFT') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-600',
            dotClassName: 'bg-slate-500',
        }
    }

    if (normalized === 'PENDING_APPROVAL') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-amber-500/5 border border-amber-500/10 text-amber-600',
            dotClassName: 'bg-amber-500',
        }
    }

    if (normalized === 'APPROVED') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-blue-500/5 border border-blue-500/10 text-blue-600',
            dotClassName: 'bg-blue-500',
        }
    }

    if (normalized === 'REJECTED') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-rose-500/5 border border-rose-500/10 text-rose-600',
            dotClassName: 'bg-rose-500',
        }
    }

    if (normalized === 'ARCHIVED') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-500',
            dotClassName: 'bg-slate-500',
        }
    }

    if (normalized === 'PUBLISHED') {
        return {
            label: getQualityStandardStatusLabel(t, normalized),
            className: 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-600',
            dotClassName: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
        }
    }

    return {
        label: getQualityStandardStatusLabel(t, normalized),
        className: 'bg-slate-500/5 border border-slate-500/10 text-slate-600',
        dotClassName: 'bg-slate-500',
    }
}

export function formatQualityActorName(rawName?: string | null) {
    if (!rawName) return undefined

    const normalized = auditUtils.formatOperatorName(rawName)
    if (!normalized || normalized === 'SYSTEM_AUTO') return undefined

    return normalized
}

export function formatQualityDateTime(value?: string | null) {
    if (!value) return undefined

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return date.toLocaleString()
}

interface QualityAuditMeta {
    label: string
    note: string
    className: string
    dotClassName: string
}

export function getQualityAuditMeta(locale: string, status?: string | null, auditor?: string | null): QualityAuditMeta {
    const normalizedStatus = normalizeQualityStandardStatus(status)
    const hasAuditor = Boolean(formatQualityActorName(auditor))

    if (normalizedStatus === 'ARCHIVED') {
        return {
            label: locale === 'zh-CN' ? '已归档' : 'Archived',
            note: locale === 'zh-CN' ? '该标准已归档，审签链路以归档版本为准。' : 'This standard is archived and follows the archived review trail.',
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-500',
            dotClassName: 'bg-slate-500',
        }
    }

    if (normalizedStatus === 'PUBLISHED' && hasAuditor) {
        return {
            label: locale === 'zh-CN' ? '审签完整' : 'Review Complete',
            note: locale === 'zh-CN' ? '已发布且审核信息完整，可按正式受控标准追溯。' : 'Published with complete reviewer information for controlled traceability.',
            className: 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-600',
            dotClassName: 'bg-emerald-500',
        }
    }

    if (normalizedStatus === 'PUBLISHED' && !hasAuditor) {
        return {
            label: locale === 'zh-CN' ? '缺少审签' : 'Missing Review',
            note: locale === 'zh-CN' ? '当前标准已发布，但审核人信息未补齐，建议尽快补录。' : 'The standard is published, but reviewer information is still missing.',
            className: 'bg-rose-500/5 border border-rose-500/10 text-rose-600',
            dotClassName: 'bg-rose-500',
        }
    }

    if (normalizedStatus === 'APPROVED') {
        return {
            label: locale === 'zh-CN' ? '已审待发' : 'Reviewed Pending Release',
            note: locale === 'zh-CN' ? '审核信息已存在，但标准尚未发布。' : 'Reviewer information exists, but the standard has not been released yet.',
            className: 'bg-blue-500/5 border border-blue-500/10 text-blue-600',
            dotClassName: 'bg-blue-500',
        }
    }

    if (normalizedStatus === 'REJECTED') {
        return {
            label: locale === 'zh-CN' ? '审批驳回' : 'Rejected',
            note: locale === 'zh-CN' ? '当前标准已被驳回，请修订后重新提交审批。' : 'The standard was rejected and must be revised before resubmission.',
            className: 'bg-rose-500/5 border border-rose-500/10 text-rose-600',
            dotClassName: 'bg-rose-500',
        }
    }

    if (normalizedStatus === 'DRAFT') {
        return {
            label: locale === 'zh-CN' ? '草稿待提审' : 'Draft Pending Submission',
            note: locale === 'zh-CN' ? '当前标准仍为草稿，尚未进入审批链路。' : 'The standard is still a draft and has not entered the approval workflow yet.',
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-600',
            dotClassName: 'bg-slate-500',
        }
    }

    return {
        label: locale === 'zh-CN' ? '待审核' : 'Pending Review',
        note: locale === 'zh-CN' ? '当前标准仍处于待审核阶段，尚未形成完整审签链。' : 'The standard is still pending review and does not have a complete review trail yet.',
        className: 'bg-amber-500/5 border border-amber-500/10 text-amber-600',
        dotClassName: 'bg-amber-500',
    }
}

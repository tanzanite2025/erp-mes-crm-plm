import { useLanguage } from '@/context/language-provider'
import { auditUtils } from '@/lib/audit-utils'

export function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string) {
    const normalized = type?.toUpperCase()
    if (type === '巡检' || normalized === 'IPQC') return t('quality.standards.values.typeProcess')
    if (type === '首检' || normalized === 'FQC') return t('quality.standards.values.typeFinal')
    return t('quality.standards.values.typeQuality')
}

export function getStatusMeta(t: ReturnType<typeof useLanguage>['t'], status?: string) {
    const normalized = status?.toUpperCase()

    if (status === '已归档' || normalized === 'ARCHIVED') {
        return {
            label: t('quality.standards.card.archived'),
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-500',
            dotClassName: 'bg-slate-500',
        }
    }

    if (status === '已发布' || normalized === 'PUBLISHED') {
        return {
            label: t('quality.standards.card.published'),
            className: 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-600',
            dotClassName: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
        }
    }

    return {
        label: t('quality.standards.card.drafting'),
        className: 'bg-amber-500/5 border border-amber-500/10 text-amber-600',
        dotClassName: 'bg-amber-500',
    }
}

export function formatQualityActorName(rawName?: string) {
    if (!rawName) return undefined

    const normalized = auditUtils.formatOperatorName(rawName)
    if (!normalized || normalized === 'SYSTEM_AUTO') return undefined

    return normalized
}

export function formatQualityDateTime(value?: string) {
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

export function getQualityAuditMeta(locale: string, status?: string, auditor?: string): QualityAuditMeta {
    const normalizedStatus = status?.toUpperCase()
    const hasAuditor = Boolean(formatQualityActorName(auditor))
    const isArchived = status === '已归档' || normalizedStatus === 'ARCHIVED'
    const isPublished = status === '已发布' || normalizedStatus === 'PUBLISHED'

    if (isArchived) {
        return {
            label: locale === 'zh-CN' ? '已归档' : 'Archived',
            note: locale === 'zh-CN' ? '该标准已归档，审签链路以归档版本为准。' : 'This standard is archived and follows the archived review trail.',
            className: 'bg-slate-500/5 border border-slate-500/10 text-slate-500',
            dotClassName: 'bg-slate-500',
        }
    }

    if (isPublished && hasAuditor) {
        return {
            label: locale === 'zh-CN' ? '审签完整' : 'Review Complete',
            note: locale === 'zh-CN' ? '已发布且审核信息完整，可按正式受控标准追溯。' : 'Published with complete reviewer information for controlled traceability.',
            className: 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-600',
            dotClassName: 'bg-emerald-500',
        }
    }

    if (isPublished && !hasAuditor) {
        return {
            label: locale === 'zh-CN' ? '缺少审签' : 'Missing Review',
            note: locale === 'zh-CN' ? '当前标准已发布，但审核人信息未补齐，建议尽快补录。' : 'The standard is published, but reviewer information is still missing.',
            className: 'bg-rose-500/5 border border-rose-500/10 text-rose-600',
            dotClassName: 'bg-rose-500',
        }
    }

    if (!isPublished && hasAuditor) {
        return {
            label: locale === 'zh-CN' ? '已审待发' : 'Reviewed Pending Release',
            note: locale === 'zh-CN' ? '审核信息已存在，但标准尚未发布。' : 'Reviewer information exists, but the standard has not been released yet.',
            className: 'bg-blue-500/5 border border-blue-500/10 text-blue-600',
            dotClassName: 'bg-blue-500',
        }
    }

    return {
        label: locale === 'zh-CN' ? '待审核' : 'Pending Review',
        note: locale === 'zh-CN' ? '当前标准仍处于待审核阶段，尚未形成完整审签链。' : 'The standard is still pending review and does not have a complete review trail yet.',
        className: 'bg-amber-500/5 border border-amber-500/10 text-amber-600',
        dotClassName: 'bg-amber-500',
    }
}

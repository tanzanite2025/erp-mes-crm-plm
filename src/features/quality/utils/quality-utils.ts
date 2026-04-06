import { useLanguage } from '@/context/language-provider'

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

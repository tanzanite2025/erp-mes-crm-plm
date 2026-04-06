import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getEquipmentToolingTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'overview', label: t('equipmentTooling.layout.tabs.overview'), href: '/equipment-tooling/overview' },
    { key: 'molds', label: t('equipmentTooling.layout.tabs.molds'), href: '/equipment-tooling/molds' },
    { key: 'loans', label: t('equipmentTooling.layout.tabs.loans'), href: '/equipment-tooling/loans' },
    { key: 'drawings', label: t('equipmentTooling.layout.tabs.drawings'), href: '/equipment-tooling/drawings' },
    { key: 'partners', label: t('equipmentTooling.layout.tabs.partners'), href: '/equipment-tooling/partners' },
  ]
}

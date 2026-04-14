import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getLogisticsConfigTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'suppliers', label: t('logisticsConfig.tabs.suppliers'), href: '/logistics-config/suppliers' },
    { key: 'vehicle-loading', label: t('logisticsConfig.tabs.vehicleLoading'), href: '/logistics-config/vehicle-loading' },
    { key: 'packaging-rules', label: t('logisticsConfig.tabs.packagingRules'), href: '/logistics-config/packaging-rules' },
    { key: 'scanning', label: t('logisticsConfig.tabs.scanning'), href: '/logistics-config/scanning' },
    { key: 'platforms', label: t('logisticsConfig.tabs.platforms'), href: '/logistics-config/platforms' },
  ]
}

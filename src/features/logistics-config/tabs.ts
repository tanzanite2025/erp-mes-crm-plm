import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getLogisticsConfigTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'packaging-rules', label: t('logisticsConfig.tabs.packagingRules'), href: '/logistics-config/packaging-rules' },
    { key: 'vehicle-loading', label: t('logisticsConfig.tabs.vehicleLoading'), href: '/logistics-config/vehicle-loading' },
    { key: 'vehicle-specs-library', label: t('logisticsConfig.tabs.vehicleSpecsLibrary'), href: '/logistics-config/vehicle-specs-library' },
  ]
}

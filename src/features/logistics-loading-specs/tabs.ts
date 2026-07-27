import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getLogisticsLoadingSpecsTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'vehicle-specs-library',
      label: t('logisticsConfig.tabs.vehicleSpecsLibrary'),
      href: '/logistics-loading-specs/vehicle-specs-library',
    },
    {
      key: 'container-specs',
      label: t('logisticsContainerManagement.tabs.specs'),
      href: '/logistics-loading-specs/container-specs',
    },
  ]
}

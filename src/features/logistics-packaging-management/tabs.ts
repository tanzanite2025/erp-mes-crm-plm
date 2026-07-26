import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getLogisticsPackagingManagementTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'packaging-rules',
      label: t('logisticsPackagingManagement.tabs.packagingRules'),
      href: '/logistics-packaging-management/packaging-rules',
    },
  ]
}

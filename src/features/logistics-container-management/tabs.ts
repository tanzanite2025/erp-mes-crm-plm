import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getLogisticsContainerManagementTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'specs',
      label: t('logisticsContainerManagement.tabs.specs'),
      href: '/logistics-container-management/specs',
    },
  ]
}

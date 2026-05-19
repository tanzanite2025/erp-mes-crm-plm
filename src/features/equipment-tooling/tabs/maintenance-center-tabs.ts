import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getMaintenanceCenterTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'overview',
      label: t('equipmentTooling.maintenanceCenter.tabs.overview'),
      href: '/equipment-maintenance/overview',
    },
    {
      key: 'records',
      label: t('equipmentTooling.maintenanceCenter.tabs.records'),
      href: '/equipment-maintenance/records',
    },
  ]
}

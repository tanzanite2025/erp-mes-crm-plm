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
      label: t('equipmentTooling.maintenanceCenter.tabs.overview' as never),
      href: '/equipment-maintenance/overview',
    },
    {
      key: 'records',
      label: t('equipmentTooling.maintenanceCenter.tabs.records' as never),
      href: '/equipment-maintenance/records',
    },
    {
      key: 'plans',
      label: t('equipmentTooling.maintenanceCenter.tabs.plans' as never),
      href: '/equipment-maintenance/plans',
    },
    {
      key: 'analytics',
      label: t('equipmentTooling.maintenanceCenter.tabs.analytics' as never),
      href: '/equipment-maintenance/analytics',
    },
  ]
}

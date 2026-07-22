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
      label: t('equipmentMaintenance.tabs.overview'),
      href: '/equipment-maintenance/overview',
    },
    {
      key: 'records',
      label: t('equipmentMaintenance.tabs.records'),
      href: '/equipment-maintenance/records',
    },
    {
      key: 'plans',
      label: t('equipmentMaintenance.tabs.plans'),
      href: '/equipment-maintenance/plans',
    },
    {
      key: 'analytics',
      label: t('equipmentMaintenance.tabs.analytics'),
      href: '/equipment-maintenance/analytics',
    },
  ]
}

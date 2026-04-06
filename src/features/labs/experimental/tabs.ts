import type { TabItem } from '@/components/module-tabs'
import { generatePermissionId } from '@/features/authz/data/permission-catalog'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getLabExperimentalTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'equipment',
      label: t('labExperimental.tabs.equipment'),
      href: '/labs/experimental/equipment',
      permissionId: generatePermissionId('tab', '/labs/experimental/equipment'),
    },
    {
      key: 'tests',
      label: t('labExperimental.tabs.tests'),
      href: '/labs/experimental/tests',
      permissionId: generatePermissionId('tab', '/labs/experimental/tests'),
    },
    {
      key: 'reports',
      label: t('labExperimental.tabs.reports'),
      href: '/labs/experimental/reports',
      permissionId: generatePermissionId('tab', '/labs/experimental/reports'),
    },
  ]
}

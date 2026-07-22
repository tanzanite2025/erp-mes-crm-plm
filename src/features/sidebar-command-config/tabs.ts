import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type Translate = (key: TranslationKey) => string

export function getSidebarCommandTabs(t: Translate): TabItem[] {
  return [
    {
      key: 'sidebar-command-library',
      label: t('sidebarCommandConfig.tabs.library'),
      href: '/sidebar-command/library',
    },
    {
      key: 'sidebar-command-assignment',
      label: t('sidebarCommandConfig.tabs.assignment'),
      href: '/sidebar-command/assignment',
    },
  ]
}

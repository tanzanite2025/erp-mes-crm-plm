import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type Translate = (key: TranslationKey) => string

export function getSidebarCommandTabs(t: Translate): TabItem[] {
  return [
    {
      key: 'sidebar-command-library',
      label: t('sidebarCommandAssignment.tabs.library'),
      href: '/sidebar-command-library',
    },
    {
      key: 'sidebar-command-assignment',
      label: t('sidebarCommandAssignment.tabs.assignment'),
      href: '/sidebar-command-assignment',
    },
  ]
}

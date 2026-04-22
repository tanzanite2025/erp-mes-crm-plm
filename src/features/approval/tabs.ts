import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TabTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getApprovalTabs(t: TabTranslator): TabItem[] {
  return [
    { key: 'requests', label: t('approval.tabs.requests'), href: '/approval/requests' },
    { key: 'routing', label: t('approval.tabs.routing'), href: '/approval/routing' },
    { key: 'history', label: t('approval.tabs.history'), href: '/approval/history' },
  ]
}

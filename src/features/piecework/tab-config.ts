import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TabTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getPieceworkTabs(t: TabTranslator): TabItem[] {
  return [
    {
      key: 'query',
      label: t('piecework.layout.tabs.query'),
      href: '/piecework/query',
    },
    {
      key: 'rules',
      label: t('piecework.layout.tabs.rules'),
      href: '/piecework/rules',
    },
    {
      key: 'stats',
      label: t('piecework.layout.tabs.stats'),
      href: '/piecework/stats',
    },
    {
      key: 'teams',
      label: t('piecework.layout.tabs.teams'),
      href: '/piecework/teams',
    },
  ]
}

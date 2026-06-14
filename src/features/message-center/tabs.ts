import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getMessageCenterTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'rules',
      label: t('messageCenter.tabs.rules'),
      href: '/message-center/rules',
    },
    {
      key: 'sources',
      label: t('messageCenter.tabs.sources'),
      href: '/message-center/sources',
    },
    {
      key: 'templates',
      label: t('messageCenter.tabs.templates'),
      href: '/message-center/templates',
    },
    {
      key: 'executions',
      label: t('messageCenter.tabs.executions'),
      href: '/message-center/executions',
    },
  ]
}

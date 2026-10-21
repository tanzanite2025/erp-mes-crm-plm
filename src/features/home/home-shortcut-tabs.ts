import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export function getHomeShortcutTabs(
  t: (key: TranslationKey) => string
): TabItem[] {
  return [{ key: 'quick-access', label: t('home.tab'), href: '/home' }]
}

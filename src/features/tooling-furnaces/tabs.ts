import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getToolingFurnacesTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'archive',
      label: t('toolingFurnaces.tabs.archive'),
      href: '/tooling-furnaces/archive',
    },
    {
      key: 'maintenance',
      label: t('toolingFurnaces.tabs.maintenance'),
      href: '/tooling-furnaces/maintenance',
    },
  ]
}

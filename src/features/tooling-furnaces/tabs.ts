import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getToolingFurnacesTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'center',
      label: t('sidebar.items.furnaceAssets'),
      href: '/tooling-furnaces/center',
    },
  ]
}

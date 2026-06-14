import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const quoteTabs: TabItem[] = [
  { key: 'orders', label: '', href: '/quotes/orders' },
]

export function getQuoteTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'orders',
      label: t('commandMenu.items.quoteManagement'),
      href: '/quotes/orders',
    },
  ]
}

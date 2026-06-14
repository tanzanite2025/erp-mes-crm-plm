import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getFinanceSettlementsTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'settlements',
      label: t('finance.layout.tabs.settlements'),
      href: '/finance-settlements',
    },
  ]
}

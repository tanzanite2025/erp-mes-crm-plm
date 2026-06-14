import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getSalesAnalysisTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'orders-analysis',
      label: t('trading.tabs.ordersAnalysis'),
      href: '/sales-analysis/orders-analysis',
    },
  ]
}

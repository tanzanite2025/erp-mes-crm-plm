import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getProductionOutsourcingTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'partners',
      label: t('productionOutsourcing.layout.tabs.partners'),
      href: '/production-outsourcing/partners',
    },
  ]
}

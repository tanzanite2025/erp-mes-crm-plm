import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getProductionQualityTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'abnormalities',
      label: t('productionQuality.layout.tabs.abnormalities'),
      href: '/production-quality/abnormalities',
    },
    {
      key: 'inspection',
      label: t('productionQuality.layout.tabs.inspection'),
      href: '/production-quality/inspection',
    },
    {
      key: 'special-buy',
      label: t('productionQuality.layout.tabs.specialBuy'),
      href: '/production-quality/special-buy',
    },
  ]
}

import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getProductionArchitectureTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'line',
      label: t('productionArchitecture.layout.tabs.line'),
      href: '/production-architecture/line',
    },
    {
      key: 'topology',
      label: t('productionArchitecture.layout.tabs.topology'),
      href: '/production-architecture/topology',
    },
  ]
}

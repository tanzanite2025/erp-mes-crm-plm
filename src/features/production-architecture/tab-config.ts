import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getProductionArchitectureTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'line',
      label: t('productionArchitecture.layout.tabs.line'),
      href: '/production-architecture/line',
    },
    {
      key: 'mindmap',
      label: t('productionArchitecture.layout.tabs.mindmap'),
      href: '/production-architecture/mindmap',
    },
    {
      key: 'hierarchyConfig',
      label: t('productionArchitecture.layout.tabs.hierarchyConfig'),
      href: '/production-architecture/hierarchy-config',
    },
    {
      key: 'topology',
      label: t('productionArchitecture.layout.tabs.topology'),
      href: '/production-architecture/topology',
    },
  ]
}

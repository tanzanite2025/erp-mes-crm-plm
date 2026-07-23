import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getProductionArchitectureTabs(t: TranslateFn): TabItem[] {
  return [
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
    {
      key: 'routes',
      label: t('productionArchitecture.layout.tabs.routes'),
      href: '/production-architecture/routes',
    },
  ]
}

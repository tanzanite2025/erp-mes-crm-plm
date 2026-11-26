import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getProductionArchitectureTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'line-structure',
      label: t('productionArchitecture.layout.tabs.productionLines'),
      href: '/production-architecture/line-structure',
    },
    {
      key: 'process-library',
      label: t('productionArchitecture.layout.tabs.processLibrary'),
      href: '/production-architecture/process-library',
    },
    {
      key: 'branch-processes',
      label: t('productionArchitecture.layout.tabs.branchProcesses'),
      href: '/production-architecture/branch-processes',
    },
    {
      key: 'routes',
      label: t('productionArchitecture.layout.tabs.routes'),
      href: '/production-architecture/routes',
    },
  ]
}

import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'

export function RawMaterialsEngineModule() {
  const { t } = useLanguage()
  const tabs = [
    {
      key: 'engine-config',
      label: t('rawMaterials.engineConfig.tab'),
      href: '/raw-materials-engine/config',
    },
    {
      key: 'batch-engine',
      label: t('rawMaterials.tabs.batchEngine'),
      href: '/raw-materials-engine/batch-engine',
    },
  ]

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

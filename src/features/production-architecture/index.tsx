import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getProductionArchitectureTabs } from './tab-config'

export function ProductionArchitecture() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('productionArchitecture.layout.title')} tabs={getProductionArchitectureTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

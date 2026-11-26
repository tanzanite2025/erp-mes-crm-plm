import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductionArchitectureTabs } from './tab-config'

export function ProductionArchitecture() {
  const { t } = useLanguage()
  return (
    <ModuleTabbedLayout tabs={getProductionArchitectureTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

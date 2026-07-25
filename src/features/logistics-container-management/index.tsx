import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getLogisticsContainerManagementTabs } from './tabs'

export function LogisticsContainerManagementModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLogisticsContainerManagementTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

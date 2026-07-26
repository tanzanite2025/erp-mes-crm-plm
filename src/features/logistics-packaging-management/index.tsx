import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getLogisticsPackagingManagementTabs } from './tabs'

export function LogisticsPackagingManagementModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLogisticsPackagingManagementTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

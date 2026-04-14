import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getLogisticsConfigTabs } from './tabs'

export function LogisticsConfigModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('sidebar.items.logisticsConfig')} tabs={getLogisticsConfigTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

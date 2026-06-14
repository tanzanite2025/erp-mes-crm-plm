import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getLogisticsSettingsTabs } from './tabs'

export function LogisticsSettingsModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLogisticsSettingsTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

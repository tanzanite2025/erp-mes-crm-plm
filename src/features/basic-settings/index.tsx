import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getBasicSettingsTabs } from './tabs'

export function BasicSettings() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getBasicSettingsTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

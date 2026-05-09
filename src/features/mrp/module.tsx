import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getMrpTabs } from './tabs'

export function MrpModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getMrpTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getTradingTabs } from './tabs'

export function Trading() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getTradingTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

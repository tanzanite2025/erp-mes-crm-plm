import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getLogisticsLoadingSpecsTabs } from './tabs'

export function LogisticsLoadingSpecsModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLogisticsLoadingSpecsTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

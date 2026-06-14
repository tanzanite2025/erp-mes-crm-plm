import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductionQualityTabs } from './tab-config'

export function ProductionQuality() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getProductionQualityTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

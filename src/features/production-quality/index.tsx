import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getProductionQualityTabs } from './tab-config'

export function ProductionQuality() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('productionQuality.layout.title')} tabs={getProductionQualityTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

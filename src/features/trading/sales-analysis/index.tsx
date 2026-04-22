import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getSalesAnalysisTabs } from './tabs'

export function SalesAnalysisModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      tabs={getSalesAnalysisTabs(t)}
      headerTitle={t('trading.salesAnalysis.moduleTitle')}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

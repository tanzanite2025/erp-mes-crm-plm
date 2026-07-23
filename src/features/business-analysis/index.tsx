import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getBusinessAnalysisTabs } from './tabs'

export function BusinessAnalysisModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      tabs={getBusinessAnalysisTabs(t)}
      headerTitle={t('businessAnalysis.moduleTitle')}
      headerDescription={t('businessAnalysis.moduleDescription')}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

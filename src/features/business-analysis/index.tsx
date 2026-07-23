import { Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getBusinessAnalysisDomain, getBusinessAnalysisTabs } from './tabs'

export function BusinessAnalysisModule() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const domain = getBusinessAnalysisDomain(pathname)

  return (
    <ModuleTabbedLayout
      tabs={getBusinessAnalysisTabs(t, domain)}
      headerTitle={t('businessAnalysis.moduleTitle')}
      headerDescription={t('businessAnalysis.moduleDescription')}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

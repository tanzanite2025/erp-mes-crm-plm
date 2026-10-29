import { Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductionMaterialIssuanceOperationGuideTabs } from '@/features/production-material-issuance/production-material-issuance-operation-guide-tab-config'
import { getPartRequirementsOperationGuideTabs } from './part-requirements-operation-guide-tab-config'
import { getMrpTabs } from './tabs'

export function MrpModule() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const guideTabs =
    pathname === '/mrp/requirements-guide'
      ? getPartRequirementsOperationGuideTabs(t)
      : pathname === '/mrp/production-material-issuance-guide'
        ? getProductionMaterialIssuanceOperationGuideTabs(t)
        : null
  const isOperationGuide = guideTabs !== null

  return (
    <ModuleTabbedLayout
      tabs={guideTabs ?? getMrpTabs(t)}
      mainClassName={isOperationGuide ? 'overflow-hidden pb-0' : undefined}
      contentClassName={
        isOperationGuide ? 'h-full flex-1 overflow-hidden' : undefined
      }
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

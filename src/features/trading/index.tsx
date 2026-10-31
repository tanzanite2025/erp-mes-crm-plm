import { Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import {
  getSalesOperationGuideTabs,
  getTradingTabs,
  SALES_OPERATION_GUIDE_PATH,
} from './tabs'

export function Trading() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isOperationGuide =
    pathname.replace(/\/$/, '') === SALES_OPERATION_GUIDE_PATH

  return (
    <ModuleTabbedLayout
      tabs={
        isOperationGuide ? getSalesOperationGuideTabs(t) : getTradingTabs(t)
      }
      mainClassName={isOperationGuide ? 'overflow-hidden pb-0' : undefined}
      contentClassName={
        isOperationGuide ? 'h-full flex-1 overflow-hidden' : undefined
      }
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

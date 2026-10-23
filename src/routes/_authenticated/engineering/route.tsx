import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import {
  getEngineeringTabs,
  getProductCreationGuideTabs,
} from '@/features/engineering/tab-config'
import { getBOMCreationOperationGuideTabs } from '@/features/product-structure/bom-creation-operation-guide-tab-config'

export const Route = createFileRoute('/_authenticated/engineering')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: EngineeringLayout,
})

function EngineeringLayout() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isBOMCreationGuide = pathname === '/engineering/bom-creation-guide'
  const tabs =
    pathname === '/engineering/product-creation-guide'
      ? getProductCreationGuideTabs(t)
      : isBOMCreationGuide
        ? getBOMCreationOperationGuideTabs(t)
        : getEngineeringTabs(t)

  return (
    <ModuleTabbedLayout
      tabs={tabs}
      mainClassName={isBOMCreationGuide ? 'overflow-hidden pb-0' : undefined}
      contentClassName={
        isBOMCreationGuide ? 'h-full flex-1 overflow-hidden' : undefined
      }
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}

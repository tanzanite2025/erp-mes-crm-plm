import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { getEngineeringTabs } from '@/features/engineering/tab-config'

export const Route = createFileRoute('/_authenticated/engineering')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: EngineeringLayout,
})

function EngineeringLayout() {
  const { t } = useLanguage()
  const tabs = getEngineeringTabs(t)

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

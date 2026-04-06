import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getEngineeringTabs } from '@/features/engineering/tab-config'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

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

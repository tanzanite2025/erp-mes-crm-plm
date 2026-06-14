import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { getOrgPersonnelTabs } from '@/features/org-personnel/tabs'

export const Route = createFileRoute('/_authenticated/personnel')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: function PersonnelRouteLayout() {
    const { t } = useLanguage()

    return (
      <ModuleTabbedLayout tabs={getOrgPersonnelTabs(t)}>
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})

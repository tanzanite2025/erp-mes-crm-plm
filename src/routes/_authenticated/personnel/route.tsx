import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getOrgPersonnelTabs } from '@/features/org-personnel/tabs'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/personnel')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: function PersonnelLayout() {
    const { t } = useLanguage()

    return (
      <ModuleTabbedLayout
        title={t('orgPersonnel.org.personnelProfile.title')}
        tabs={getOrgPersonnelTabs(t)}
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})

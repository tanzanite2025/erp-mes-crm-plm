import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getApprovalTabs } from '@/features/approval/tabs'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

function ApprovalRouteLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('approval.centerTitle')} tabs={getApprovalTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

export const Route = createFileRoute('/_authenticated/approval')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: ApprovalRouteLayout,
})

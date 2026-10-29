import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import {
  ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH,
  getAttendanceManagementOperationGuideTabs,
  getOrgPersonnelTabs,
  getOrganizationAndAccountOperationGuideTabs,
  ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
} from '@/features/org-personnel/tabs'

export const Route = createFileRoute('/_authenticated/personnel')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: function PersonnelRouteLayout() {
    const { t } = useLanguage()
    const pathname = useLocation({
      select: (location) => location.pathname.replace(/\/$/, ''),
    })
    const isAttendanceGuideRoute =
      pathname === ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH
    const isGuideRoute =
      isAttendanceGuideRoute ||
      pathname === ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
    const isAccountsRoute = pathname === '/personnel/accounts'

    return (
      <ModuleTabbedLayout
        tabs={
          isAttendanceGuideRoute
            ? getAttendanceManagementOperationGuideTabs(t)
            : isGuideRoute
              ? getOrganizationAndAccountOperationGuideTabs(t)
              : getOrgPersonnelTabs(t)
        }
        mainClassName={isGuideRoute ? 'overflow-hidden pb-0' : undefined}
        contentClassName={
          isGuideRoute
            ? 'h-full flex-1 overflow-hidden'
            : isAccountsRoute
              ? 'h-auto min-h-full shrink-0'
              : undefined
        }
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})

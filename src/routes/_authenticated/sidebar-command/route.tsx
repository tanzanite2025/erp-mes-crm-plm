import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/sidebar-command')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: function SidebarCommandRouteLayout() {
    return <Outlet />
  },
})

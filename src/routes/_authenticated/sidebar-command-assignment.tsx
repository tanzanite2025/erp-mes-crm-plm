import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { SidebarCommandAssignmentPage } from '@/features/sidebar-command-assignment'

export const Route = createFileRoute(
  '/_authenticated/sidebar-command-assignment'
)({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: SidebarCommandAssignmentPage,
})

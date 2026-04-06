import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/features/dashboard/layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: DashboardLayout,
})

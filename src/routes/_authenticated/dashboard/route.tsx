import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { DashboardLayout } from '@/features/dashboard/layout'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: DashboardLayout,
})

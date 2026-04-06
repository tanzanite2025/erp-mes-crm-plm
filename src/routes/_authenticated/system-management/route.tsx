import { createFileRoute } from '@tanstack/react-router'
import { SystemMgmt } from '@/features/system-mgmt'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/system-management')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: SystemMgmt,
})

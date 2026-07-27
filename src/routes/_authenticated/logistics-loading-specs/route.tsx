import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/logistics-loading-specs')(
  {
    beforeLoad: async ({ location }) => {
      await ensureAuthenticatedRouteSession(location.pathname)
    },
  }
)

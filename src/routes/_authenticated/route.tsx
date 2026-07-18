import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: AuthenticatedLayout,
})

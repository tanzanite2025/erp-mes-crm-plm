import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { BasicSettings } from '@/features/basic-settings'

export const Route = createFileRoute('/_authenticated/basic-settings')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
    if (location.pathname === '/basic-settings') {
      throw redirect({ to: '/basic-settings/units' })
    }
  },
  component: BasicSettings,
})

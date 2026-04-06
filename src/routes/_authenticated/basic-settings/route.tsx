import { createFileRoute, redirect } from '@tanstack/react-router'
import { BasicSettings } from '@/features/basic-settings'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'

export const Route = createFileRoute('/_authenticated/basic-settings')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
    if (location.pathname === '/basic-settings') {
      throw redirect({ to: '/basic-settings/dm-numbering' })
    }
  },
  component: BasicSettings,
})

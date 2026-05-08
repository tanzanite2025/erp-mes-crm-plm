import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { ToolingFurnaces } from '@/features/tooling-furnaces'

export const Route = createFileRoute('/_authenticated/tooling-furnaces')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: ToolingFurnaces,
})

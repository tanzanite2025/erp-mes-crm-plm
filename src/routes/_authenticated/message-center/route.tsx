import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { MessageCenterLayout } from '@/features/message-center/message-center-layout'

export const Route = createFileRoute('/_authenticated/message-center')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: MessageCenterLayout,
})

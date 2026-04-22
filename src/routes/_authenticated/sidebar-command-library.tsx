import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { SidebarCommandLibraryPage } from '@/features/sidebar-command-assignment/library'

export const Route = createFileRoute('/_authenticated/sidebar-command-library')(
  {
    beforeLoad: async ({ location }) => {
      await ensureAuthenticatedRouteSession(location.pathname)
    },
    component: SidebarCommandLibraryPage,
  }
)

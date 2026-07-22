import { createFileRoute } from '@tanstack/react-router'
import { SidebarCommandAssignmentPage } from '@/features/sidebar-command-config'

export const Route = createFileRoute(
  '/_authenticated/sidebar-command/assignment'
)({
  component: SidebarCommandAssignmentPage,
})

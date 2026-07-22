import { createFileRoute } from '@tanstack/react-router'
import { SidebarCommandAssignmentPage } from '@/features/sidebar-command-config/assignment-page'

export const Route = createFileRoute(
  '/_authenticated/sidebar-command/assignment'
)({
  component: SidebarCommandAssignmentPage,
})

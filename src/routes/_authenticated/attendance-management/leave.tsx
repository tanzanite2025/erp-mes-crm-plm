import { createFileRoute } from '@tanstack/react-router'
import { LeaveManagementRoutePage } from '@/features/org-personnel/components/leave-management-route-page'

export const Route = createFileRoute(
  '/_authenticated/attendance-management/leave'
)({
  component: LeaveManagementRoutePage,
})

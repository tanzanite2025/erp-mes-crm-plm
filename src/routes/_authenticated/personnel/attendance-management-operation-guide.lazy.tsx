import { createLazyFileRoute } from '@tanstack/react-router'
import { AttendanceManagementOperationGuidePage } from '@/features/org-personnel/pages/attendance-management-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/personnel/attendance-management-operation-guide'
)({ component: AttendanceManagementOperationGuidePage })

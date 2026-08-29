import { createFileRoute } from '@tanstack/react-router'
import { AttendanceDevicesRoutePage } from '@/features/org-personnel/components/attendance-devices-route-page'

export const Route = createFileRoute(
  '/_authenticated/attendance-management/devices'
)({
  component: AttendanceDevicesRoutePage,
})

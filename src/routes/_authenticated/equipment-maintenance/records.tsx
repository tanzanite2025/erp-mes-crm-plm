import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceRecordsPage } from '@/features/equipment-maintenance/components/maintenance-records-page'

export const Route = createFileRoute(
  '/_authenticated/equipment-maintenance/records'
)({
  component: MaintenanceRecordsPage,
})

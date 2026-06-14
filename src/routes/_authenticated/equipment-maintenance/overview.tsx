import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceOverview } from '@/features/equipment-tooling/components/maintenance-overview'

export const Route = createFileRoute(
  '/_authenticated/equipment-maintenance/overview'
)({
  component: MaintenanceOverview,
})

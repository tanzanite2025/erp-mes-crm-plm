import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceAnalyticsPage } from '@/features/equipment-tooling/components/maintenance-analytics-page'

export const Route = createFileRoute(
  '/_authenticated/equipment-maintenance/analytics'
)({
  component: MaintenanceAnalyticsPage,
})

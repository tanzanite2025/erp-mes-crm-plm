import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceAnalyticsPage } from '@/features/equipment-maintenance/components/maintenance-analytics-page'

export const Route = createFileRoute(
  '/_authenticated/equipment-maintenance/analytics'
)({
  component: MaintenanceAnalyticsPage,
})

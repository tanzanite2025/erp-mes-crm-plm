import { createFileRoute } from '@tanstack/react-router'
import { MaintenancePlansPage } from '@/features/equipment-tooling/components/maintenance-plans-page'

export const Route = createFileRoute(
  '/_authenticated/equipment-maintenance/plans'
)({
  component: MaintenancePlansPage,
})

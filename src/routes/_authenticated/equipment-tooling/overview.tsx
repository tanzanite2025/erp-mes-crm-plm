import { createFileRoute } from '@tanstack/react-router'
import { AssetDashboard } from '@/features/equipment-tooling/tabs/asset-dashboard'

export const Route = createFileRoute(
  '/_authenticated/equipment-tooling/overview'
)({
  component: AssetDashboard,
})

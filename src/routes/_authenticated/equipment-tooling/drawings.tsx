import { createFileRoute } from '@tanstack/react-router'
import { DrawingMgmt } from '@/features/equipment-tooling/tabs/drawing-mgmt'

export const Route = createFileRoute(
  '/_authenticated/equipment-tooling/drawings'
)({
  component: DrawingMgmt,
})

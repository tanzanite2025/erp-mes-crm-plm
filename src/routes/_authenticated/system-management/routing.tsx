import { createFileRoute } from '@tanstack/react-router'
import { RoutingTab } from '@/features/system-mgmt/tabs/routing-tab'

export const Route = createFileRoute(
  '/_authenticated/system-management/routing'
)({
  component: () => <RoutingTab />,
})

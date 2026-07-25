import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsContainerManagementModule } from '@/features/logistics-container-management'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-container-management'
)({
  component: LogisticsContainerManagementModule,
})

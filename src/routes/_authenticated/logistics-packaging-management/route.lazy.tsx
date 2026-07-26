import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsPackagingManagementModule } from '@/features/logistics-packaging-management'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-packaging-management'
)({
  component: LogisticsPackagingManagementModule,
})

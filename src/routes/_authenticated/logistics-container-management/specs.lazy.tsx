import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsContainerManagementPage } from '@/features/logistics-container-management/container-specs-page'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-container-management/specs'
)({
  component: LogisticsContainerManagementPage,
})

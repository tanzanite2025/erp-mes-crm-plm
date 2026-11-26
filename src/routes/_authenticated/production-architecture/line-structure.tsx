import { createFileRoute } from '@tanstack/react-router'
import { ProductionLineManagementPage } from '@/features/production-architecture/pages/production-line-management-page'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/line-structure'
)({
  component: ProductionLineManagementPage,
})

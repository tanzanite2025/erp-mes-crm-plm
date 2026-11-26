import { createFileRoute } from '@tanstack/react-router'
import { ProductionMBOMBranchProcessConfigurationPage } from '@/features/production-architecture/pages/production-mbom-branch-process-configuration-page'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/branch-processes'
)({
  component: ProductionMBOMBranchProcessConfigurationPage,
})

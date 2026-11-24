import { createFileRoute } from '@tanstack/react-router'
import { ProductionProcessLibraryConfigurationPage } from '@/features/production-architecture/pages/production-process-library-configuration-page'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/process-library'
)({
  component: ProductionProcessLibraryConfigurationPage,
})

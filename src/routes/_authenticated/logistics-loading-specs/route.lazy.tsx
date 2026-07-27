import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsLoadingSpecsModule } from '@/features/logistics-loading-specs'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-loading-specs'
)({
  component: LogisticsLoadingSpecsModule,
})

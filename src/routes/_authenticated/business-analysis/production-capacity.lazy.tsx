import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionCapacityAnalysisTab } from '@/features/business-analysis/tabs/production-capacity-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/production-capacity'
)({
  component: ProductionCapacityAnalysisTab,
})

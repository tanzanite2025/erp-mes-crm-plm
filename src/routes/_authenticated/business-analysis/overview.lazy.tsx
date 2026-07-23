import { createLazyFileRoute } from '@tanstack/react-router'
import { BusinessAnalysisOverviewTab } from '@/features/business-analysis/tabs/analysis-overview-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/overview'
)({
  component: BusinessAnalysisOverviewTab,
})

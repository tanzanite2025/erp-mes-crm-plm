import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsPackagingRulesTab } from '@/features/logistics-packaging-management/packaging-rules-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-packaging-management/packaging-rules'
)({
  component: LogisticsPackagingRulesTab,
})

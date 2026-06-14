import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsPackagingRulesTab } from '@/features/logistics-config/packaging-rules-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-config/packaging-rules'
)({
  component: LogisticsPackagingRulesTab,
})

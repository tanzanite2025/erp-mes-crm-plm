import { createLazyFileRoute } from '@tanstack/react-router'
import { UnifiedProvidersTab } from '@/features/logistics-config/unified-providers-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-settings/platforms'
)({
  component: UnifiedProvidersTab,
})

import { createFileRoute } from '@tanstack/react-router'
import { ApsEngineConfigTab } from '@/features/aps-scheduling/tabs/engine-config'

export const Route = createFileRoute(
  '/_authenticated/aps-scheduling/engine-config'
)({
  component: ApsEngineConfigTab,
})

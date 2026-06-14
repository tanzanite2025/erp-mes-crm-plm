import { createFileRoute } from '@tanstack/react-router'
import { AiAccessControl } from '@/features/ai-assistant/tabs/ai-access-control'

export const Route = createFileRoute(
  '/_authenticated/system-management/ai-capability'
)({
  component: AiAccessControl,
})

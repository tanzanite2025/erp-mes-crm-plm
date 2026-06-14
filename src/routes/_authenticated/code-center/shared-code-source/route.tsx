import { createFileRoute } from '@tanstack/react-router'
import { SharedCodeSourceLayout } from '@/features/code-center/shared-code-source-layout'

export const Route = createFileRoute(
  '/_authenticated/code-center/shared-code-source'
)({
  component: SharedCodeSourceLayout,
})

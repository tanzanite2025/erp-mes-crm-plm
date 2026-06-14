import { createFileRoute } from '@tanstack/react-router'
import { LineMindmap } from '@/features/production-shared/tabs/line-mindmap'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/mindmap'
)({
  component: () => <LineMindmap />,
})

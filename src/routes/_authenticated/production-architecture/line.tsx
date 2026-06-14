import { createFileRoute } from '@tanstack/react-router'
import { LineMgmt } from '@/features/production-shared/tabs/line-mgmt'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/line'
)({
  component: () => <LineMgmt />,
})

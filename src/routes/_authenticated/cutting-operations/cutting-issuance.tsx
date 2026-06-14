import { createFileRoute } from '@tanstack/react-router'
import { ApsCuttingIssuanceTab } from '@/features/aps-scheduling/tabs/cutting-issuance'

export const Route = createFileRoute(
  '/_authenticated/cutting-operations/cutting-issuance'
)({
  component: ApsCuttingIssuanceTab,
})

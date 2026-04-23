import { createFileRoute } from '@tanstack/react-router'
import { ApsCuttingIssuanceTab } from '@/features/aps-scheduling/tabs/cutting-issuance'

export const Route = createFileRoute('/_authenticated/aps-scheduling/cutting-issuance')({
  component: ApsCuttingIssuanceTab,
})

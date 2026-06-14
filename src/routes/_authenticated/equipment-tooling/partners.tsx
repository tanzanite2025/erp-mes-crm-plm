import { createFileRoute } from '@tanstack/react-router'
import { PartnerMgmt } from '@/features/equipment-tooling/tabs/partner-mgmt'

export const Route = createFileRoute(
  '/_authenticated/equipment-tooling/partners'
)({
  component: PartnerMgmt,
})

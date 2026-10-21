import { createFileRoute } from '@tanstack/react-router'
import { BusinessApprovalPolicyConfigurations } from '@/features/approval/tabs/business-approval-policy-configurations'

export const Route = createFileRoute(
  '/_authenticated/approval/business-approval-policies'
)({
  component: BusinessApprovalPolicyConfigurations,
})

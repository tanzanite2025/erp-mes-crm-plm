import { createLazyFileRoute } from '@tanstack/react-router'
import { OrganizationAndAccountOperationGuidePage } from '@/features/org-personnel/pages/organization-and-account-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/personnel/organization-and-account-operation-guide'
)({
  component: OrganizationAndAccountOperationGuidePage,
})

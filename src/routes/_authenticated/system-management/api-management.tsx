import { createFileRoute } from '@tanstack/react-router'
import { APIManagementTab } from '@/features/system-mgmt/tabs/api-management-tab'

export const Route = createFileRoute(
  '/_authenticated/system-management/api-management'
)({
  component: APIManagementTab,
})

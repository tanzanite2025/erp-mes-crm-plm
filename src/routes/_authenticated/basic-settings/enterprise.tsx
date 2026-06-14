import { createFileRoute } from '@tanstack/react-router'
import { EnterpriseMgmt } from '@/features/basic-settings/tabs/enterprise-mgmt'

export const Route = createFileRoute(
  '/_authenticated/basic-settings/enterprise'
)({
  component: EnterpriseMgmt,
})

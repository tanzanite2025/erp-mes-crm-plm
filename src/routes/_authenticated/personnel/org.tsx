import { createFileRoute } from '@tanstack/react-router'
import { OrgMgmt } from '@/features/org-personnel/tabs/org-mgmt'

export const Route = createFileRoute('/_authenticated/personnel/org')({
  component: () => <OrgMgmt />,
})

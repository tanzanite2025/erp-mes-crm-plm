import { createFileRoute } from '@tanstack/react-router'
import { UserRights } from '@/features/system-mgmt/tabs/index'

export const Route = createFileRoute('/_authenticated/personnel/rights')({
  component: () => <UserRights />,
})

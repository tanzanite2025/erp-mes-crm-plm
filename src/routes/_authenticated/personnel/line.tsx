import { createFileRoute } from '@tanstack/react-router'
import { LineMgmt } from '@/features/production-shared/tabs/line-mgmt'

export const Route = createFileRoute('/_authenticated/personnel/line')({
  component: () => <LineMgmt />,
})

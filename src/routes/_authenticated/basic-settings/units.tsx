import { createFileRoute } from '@tanstack/react-router'
import { UnitMgmt } from '@/features/basic-settings/tabs/unit-mgmt'

export const Route = createFileRoute('/_authenticated/basic-settings/units')({
  component: UnitMgmt,
})

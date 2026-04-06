import { createFileRoute } from '@tanstack/react-router'
import { MoldMgmt } from '@/features/equipment-tooling/tabs/mold-mgmt'

export const Route = createFileRoute('/_authenticated/equipment-tooling/molds')({
    component: MoldMgmt,
})

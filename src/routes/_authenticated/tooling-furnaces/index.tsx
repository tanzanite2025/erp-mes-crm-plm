import { createFileRoute } from '@tanstack/react-router'
import { FurnaceMgmt } from '@/features/equipment-tooling/tabs/furnace-mgmt'

export const Route = createFileRoute('/_authenticated/tooling-furnaces/')({
  component: FurnaceMgmt,
})

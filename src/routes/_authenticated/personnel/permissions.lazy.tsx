import { createLazyFileRoute } from '@tanstack/react-router'
import { PermStatsTab } from '@/features/system-mgmt/tabs/perm-stats-tab'

export const Route = createLazyFileRoute('/_authenticated/personnel/permissions')({
  component: PermStatsTab,
})

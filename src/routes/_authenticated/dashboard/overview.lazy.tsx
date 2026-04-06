import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardOverviewTab } from '@/features/dashboard/tabs/overview-tab'

export const Route = createLazyFileRoute('/_authenticated/dashboard/overview')({
  component: DashboardOverviewTab,
})

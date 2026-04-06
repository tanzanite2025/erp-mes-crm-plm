import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardAnalyticsTab } from '@/features/dashboard/tabs/analytics-tab'

export const Route = createLazyFileRoute('/_authenticated/dashboard/analytics')({
  component: DashboardAnalyticsTab,
})

import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardReportsTab } from '@/features/dashboard/tabs/reports-tab'

export const Route = createLazyFileRoute('/_authenticated/dashboard/reports')({
  component: DashboardReportsTab,
})

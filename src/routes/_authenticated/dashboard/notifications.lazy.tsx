import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardNotificationsTab } from '@/features/dashboard/tabs/notifications-tab'

export const Route = createLazyFileRoute('/_authenticated/dashboard/notifications')({
  component: DashboardNotificationsTab,
})

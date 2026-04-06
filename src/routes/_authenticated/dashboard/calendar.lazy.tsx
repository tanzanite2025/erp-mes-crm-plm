import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardCalendarTab } from '@/features/dashboard/tabs/calendar-tab'

export const Route = createLazyFileRoute('/_authenticated/dashboard/calendar')({
  component: DashboardCalendarTab,
})

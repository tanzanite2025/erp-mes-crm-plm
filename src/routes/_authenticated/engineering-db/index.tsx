import { createFileRoute } from '@tanstack/react-router'
import { OverviewTab } from '@/features/engineering-db/tabs/overview-tab'

export const Route = createFileRoute('/_authenticated/engineering-db/')({
  component: OverviewTab,
})

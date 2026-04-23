import { createFileRoute } from '@tanstack/react-router'
import { CuttingPlanTab } from '@/features/engineering-db/tabs/cutting-plan-tab'

export const Route = createFileRoute('/_authenticated/engineering-db/cutting-plan')({
  component: CuttingPlanTab,
})

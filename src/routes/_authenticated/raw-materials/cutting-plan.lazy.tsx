import { createLazyFileRoute } from '@tanstack/react-router'
import { CuttingPlanTab } from '@/features/engineering-db/tabs/cutting-plan-tab'

export const Route = createLazyFileRoute('/_authenticated/raw-materials/cutting-plan')({
  component: CuttingPlanTab,
})

import { createLazyFileRoute } from '@tanstack/react-router'
import { AdjustmentHistory } from '@/features/warehouse/tabs/adjustment-history'

export const Route = createLazyFileRoute(
  '/_authenticated/warehouse/adjustments'
)({
  component: AdjustmentHistory,
})

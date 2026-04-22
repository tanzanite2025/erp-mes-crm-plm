import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesReturnsTab } from '@/features/trading/tabs/sales-returns-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/trading/sales-returns'
)({
  component: SalesReturnsTab,
})

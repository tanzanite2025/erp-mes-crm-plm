import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesExchangesTab } from '@/features/trading/tabs/sales-exchanges-tab'

export const Route = createLazyFileRoute(
  '/_authenticated/trading/sales-exchanges'
)({
  component: SalesExchangesTab,
})

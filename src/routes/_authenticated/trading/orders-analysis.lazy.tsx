import { createLazyFileRoute } from '@tanstack/react-router'
import { OrdersAnalysisTab } from '@/features/trading/sales/analytics/tabs/analytics-tab'

export const Route = createLazyFileRoute('/_authenticated/trading/orders-analysis')({
  component: OrdersAnalysisTab,
})

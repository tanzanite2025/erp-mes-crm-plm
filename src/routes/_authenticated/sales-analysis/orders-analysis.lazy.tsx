import { createLazyFileRoute } from '@tanstack/react-router'
import { OrdersAnalysisTab } from '@/features/trading/sales/analytics/tabs/analytics-tab'

export const Route = createLazyFileRoute('/_authenticated/sales-analysis/orders-analysis')({
  component: OrdersAnalysisTab,
})

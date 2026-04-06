import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesOrders } from '@/features/trading/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/trading/sales-orders')({
  component: SalesOrders,
})

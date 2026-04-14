import { createLazyFileRoute } from '@tanstack/react-router'
import { ShippingHistoryPage } from '@/features/trading/shipping-management/history-page'

export const Route = createLazyFileRoute('/_authenticated/shipping-management/history')({
  component: ShippingHistoryPage,
})

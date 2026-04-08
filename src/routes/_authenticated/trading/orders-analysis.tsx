import { createFileRoute } from '@tanstack/react-router'

export interface OrdersAnalysisSearch {
  customerId?: string
  productId?: string
  timeRange?: string
}

export const Route = createFileRoute('/_authenticated/trading/orders-analysis')({
  validateSearch: (search: Record<string, unknown>): OrdersAnalysisSearch => {
    return {
      customerId: (search.customerId as string) || undefined,
      productId: (search.productId as string) || undefined,
      timeRange: (search.timeRange as string) || 'last_30_days',
    }
  },
})

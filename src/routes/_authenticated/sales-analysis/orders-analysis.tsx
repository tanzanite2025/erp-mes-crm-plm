import { createFileRoute } from '@tanstack/react-router'

export interface SalesAnalysisOrdersAnalysisSearch {
  customerId?: string
  productId?: string
  timeRange?: string
}

export const Route = createFileRoute(
  '/_authenticated/sales-analysis/orders-analysis'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): SalesAnalysisOrdersAnalysisSearch => {
    return {
      customerId: (search.customerId as string) || undefined,
      productId: (search.productId as string) || undefined,
      timeRange: (search.timeRange as string) || 'last_30_days',
    }
  },
})

import { createFileRoute } from '@tanstack/react-router'

export interface PurchaseOrderSearch {
  search?: string
  detailId?: string
}

export const Route = createFileRoute('/_authenticated/purchase/orders')({
  validateSearch: (search: Record<string, unknown>): PurchaseOrderSearch => {
    return {
      search: (search.search as string) || undefined,
      detailId: (search.detailId as string) || undefined,
    }
  },
})

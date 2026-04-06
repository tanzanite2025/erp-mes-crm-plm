import { createFileRoute } from '@tanstack/react-router'

export interface SalesOrderSearch {
  search?: string
  detailId?: string
  activeCommandId?: string
}

export const Route = createFileRoute('/_authenticated/trading/sales-orders')({
  validateSearch: (search: Record<string, unknown>): SalesOrderSearch => {
    return {
      search: (search.search as string) || undefined,
      detailId: (search.detailId as string) || undefined,
      activeCommandId: (search.activeCommandId as string) || undefined,
    }
  },
})

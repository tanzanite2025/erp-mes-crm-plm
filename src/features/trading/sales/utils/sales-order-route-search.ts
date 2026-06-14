export interface SalesOrderRouteSearch {
  search?: string
  detailId?: string
  activeCommandId?: string
  customerId?: string
  customerName?: string
}

export function parseSalesOrderRouteSearch(
  search: Record<string, unknown>
): SalesOrderRouteSearch {
  return {
    search: (search.search as string) || undefined,
    detailId: (search.detailId as string) || undefined,
    activeCommandId: (search.activeCommandId as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    customerName: (search.customerName as string) || undefined,
  }
}

export interface SalesExchangeRouteSearch {
  search?: string
  status?: string
  customerId?: string
  customerName?: string
  sourceOrderId?: string
  exchangeId?: string
}

export function parseSalesExchangeRouteSearch(
  search: Record<string, unknown>
): SalesExchangeRouteSearch {
  return {
    search: (search.search as string) || undefined,
    status: (search.status as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    customerName: (search.customerName as string) || undefined,
    sourceOrderId: (search.sourceOrderId as string) || undefined,
    exchangeId: (search.exchangeId as string) || undefined,
  }
}

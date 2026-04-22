export interface SalesReturnRouteSearch {
  search?: string
  status?: string
  customerId?: string
  customerName?: string
  sourceOrderId?: string
  returnId?: string
  detailId?: string
}

export function parseSalesReturnRouteSearch(
  search: Record<string, unknown>
): SalesReturnRouteSearch {
  const returnId = (search.returnId as string) || (search.detailId as string)

  return {
    search: (search.search as string) || undefined,
    status: (search.status as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    customerName: (search.customerName as string) || undefined,
    sourceOrderId: (search.sourceOrderId as string) || undefined,
    returnId: returnId || undefined,
    detailId: (search.detailId as string) || undefined,
  }
}

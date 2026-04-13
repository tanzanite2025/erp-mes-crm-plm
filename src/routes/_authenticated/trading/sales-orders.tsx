import { createFileRoute } from '@tanstack/react-router'
import {
  parseSalesOrderRouteSearch,
  type SalesOrderRouteSearch,
} from '@/features/trading/sales/utils/sales-order-route-search'

export type SalesOrderSearch = SalesOrderRouteSearch

export const Route = createFileRoute('/_authenticated/trading/sales-orders')({
  validateSearch: (search: Record<string, unknown>): SalesOrderSearch => parseSalesOrderRouteSearch(search),
})

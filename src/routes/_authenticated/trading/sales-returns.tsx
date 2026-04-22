import { createFileRoute } from '@tanstack/react-router'
import {
  parseSalesReturnRouteSearch,
  type SalesReturnRouteSearch,
} from '@/features/trading/sales/utils/sales-return-route-search'

export type SalesReturnsSearch = SalesReturnRouteSearch

export const Route = createFileRoute('/_authenticated/trading/sales-returns')({
  validateSearch: (search: Record<string, unknown>): SalesReturnsSearch =>
    parseSalesReturnRouteSearch(search),
})

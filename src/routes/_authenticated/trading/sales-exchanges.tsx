import { createFileRoute } from '@tanstack/react-router'
import {
  parseSalesExchangeRouteSearch,
  type SalesExchangeRouteSearch,
} from '@/features/trading/sales-exchanges/utils/sales-exchange-route-search'

export type SalesExchangesSearch = SalesExchangeRouteSearch

export const Route = createFileRoute('/_authenticated/trading/sales-exchanges')(
  {
    validateSearch: (search: Record<string, unknown>): SalesExchangesSearch =>
      parseSalesExchangeRouteSearch(search),
  }
)

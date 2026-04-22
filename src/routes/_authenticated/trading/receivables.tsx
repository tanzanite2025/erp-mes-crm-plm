import { createFileRoute } from '@tanstack/react-router'
import {
  parseReceivableRouteSearch,
  type ReceivableRouteSearch,
} from '@/features/trading/receivables/utils/receivable-route-search'

export const Route = createFileRoute('/_authenticated/trading/receivables')({
  validateSearch: (search: Record<string, unknown>): ReceivableRouteSearch =>
    parseReceivableRouteSearch(search),
})

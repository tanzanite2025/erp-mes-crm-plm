import { createFileRoute } from '@tanstack/react-router'
import { parseBusinessRecordSearchRouteParameters } from '@/hooks/use-business-record-search-keyword'

export const Route = createFileRoute('/_authenticated/quotes/orders')({
  validateSearch: parseBusinessRecordSearchRouteParameters,
})

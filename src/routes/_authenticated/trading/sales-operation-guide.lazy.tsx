import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesOperationGuidePage } from '@/features/trading/pages/sales-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/trading/sales-operation-guide'
)({ component: SalesOperationGuidePage })

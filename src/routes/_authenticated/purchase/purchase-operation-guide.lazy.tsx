import { createLazyFileRoute } from '@tanstack/react-router'
import { PurchaseOperationGuidePage } from '@/features/purchase/pages/purchase-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/purchase/purchase-operation-guide'
)({ component: PurchaseOperationGuidePage })

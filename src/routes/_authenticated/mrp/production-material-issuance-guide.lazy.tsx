import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionMaterialIssuanceOperationGuidePage } from '@/features/production-material-issuance/pages/production-material-issuance-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/mrp/production-material-issuance-guide'
)({ component: ProductionMaterialIssuanceOperationGuidePage })

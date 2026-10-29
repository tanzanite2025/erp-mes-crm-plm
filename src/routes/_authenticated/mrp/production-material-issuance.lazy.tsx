import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionMaterialIssuanceRoutePage } from '@/features/production-material-issuance/pages/production-material-issuance-route-page'

export const Route = createLazyFileRoute(
  '/_authenticated/mrp/production-material-issuance'
)({ component: ProductionMaterialIssuanceRoutePage })

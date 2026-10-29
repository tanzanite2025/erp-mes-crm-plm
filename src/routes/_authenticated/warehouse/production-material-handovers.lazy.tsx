import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionMaterialIssuanceWarehouseHandoverRoutePage } from '@/features/production-material-issuance/pages/production-material-issuance-warehouse-handover-route-page'

export const Route = createLazyFileRoute(
  '/_authenticated/warehouse/production-material-handovers'
)({
  component: ProductionMaterialIssuanceWarehouseHandoverRoutePage,
})

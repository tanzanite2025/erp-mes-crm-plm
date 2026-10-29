import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionMaterialHandoversOperationGuidePage } from '@/features/warehouse/pages/production-material-handovers-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/warehouse/production-material-handovers-guide'
)({ component: ProductionMaterialHandoversOperationGuidePage })

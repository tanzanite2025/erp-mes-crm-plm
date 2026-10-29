import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductionMaterialCreationOperationGuidePage } from '@/features/material-archive/pages/production-material-creation-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/materials/production-material-creation-guide'
)({ component: ProductionMaterialCreationOperationGuidePage })

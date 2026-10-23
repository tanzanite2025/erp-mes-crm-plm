import { createLazyFileRoute } from '@tanstack/react-router'
import { BOMCreationOperationGuidePage } from '@/features/product-structure/pages/bom-creation-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/engineering/bom-creation-guide'
)({ component: BOMCreationOperationGuidePage })

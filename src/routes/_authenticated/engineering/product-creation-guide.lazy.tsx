import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductCreationOperationGuidePage } from '@/features/engineering/pages/product-creation-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/engineering/product-creation-guide'
)({ component: ProductCreationOperationGuidePage })

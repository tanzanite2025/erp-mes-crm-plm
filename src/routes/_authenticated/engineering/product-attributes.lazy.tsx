import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductTemplateAttributeClassificationManagement } from '@/features/engineering/tabs/product-template-attribute-classification-management'

export const Route = createLazyFileRoute(
  '/_authenticated/engineering/product-attributes'
)({
  component: ProductTemplateAttributeClassificationManagement,
})

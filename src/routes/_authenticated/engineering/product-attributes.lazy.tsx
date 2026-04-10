import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductAttributesMgmt } from '@/features/engineering/tabs/product-attributes-mgmt'

export const Route = createLazyFileRoute('/_authenticated/engineering/product-attributes')({
  component: ProductAttributesMgmt,
})

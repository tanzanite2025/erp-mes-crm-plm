import { createFileRoute } from '@tanstack/react-router'
import { ProductBindingTab } from '@/features/cutting-operations/tabs/product-binding/product-binding-tab'

export const Route = createFileRoute(
  '/_authenticated/cutting-operations/product-binding'
)({
  component: ProductBindingTab,
})

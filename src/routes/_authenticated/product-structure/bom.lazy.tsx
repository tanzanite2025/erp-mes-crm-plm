import { createLazyFileRoute } from '@tanstack/react-router'
import { BOMMgmt } from '@/features/product-structure/tabs/bom-mgmt'

export const Route = createLazyFileRoute(
  '/_authenticated/product-structure/bom'
)({
  component: BOMMgmt,
})

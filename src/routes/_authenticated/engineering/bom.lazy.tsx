import { createLazyFileRoute } from '@tanstack/react-router'
import { BOMMgmt } from '@/features/product-structure/tabs/bom-mgmt'

export const Route = createLazyFileRoute('/_authenticated/engineering/bom')({
  component: BOMMgmt,
})

import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductAppearanceMgmt } from '@/features/engineering/tabs/product-appearance-mgmt'

export const Route = createLazyFileRoute('/_authenticated/engineering/product-appearance')({
  component: ProductAppearanceMgmt,
})

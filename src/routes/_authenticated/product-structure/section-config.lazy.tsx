import { createLazyFileRoute } from '@tanstack/react-router'
import { BOMSectionConfigTab } from '@/features/product-structure/tabs/bom-section-config'

export const Route = createLazyFileRoute('/_authenticated/product-structure/section-config')({
  component: BOMSectionConfigTab,
})

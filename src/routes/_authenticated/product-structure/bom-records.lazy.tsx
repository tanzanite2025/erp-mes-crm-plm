import { createLazyFileRoute } from '@tanstack/react-router'
import { BOMRecordsTab } from '@/features/product-structure/tabs/bom-records'

export const Route = createLazyFileRoute('/_authenticated/product-structure/bom-records')({
  component: BOMRecordsTab,
})

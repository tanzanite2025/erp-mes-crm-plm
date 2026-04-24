import { createFileRoute } from '@tanstack/react-router'
import { CuttingSizeInventoryTab } from '@/features/cutting-operations/tabs/size-inventory/size-inventory-tab'

export const Route = createFileRoute('/_authenticated/cutting-operations/size-inventory')({
  component: CuttingSizeInventoryTab,
})

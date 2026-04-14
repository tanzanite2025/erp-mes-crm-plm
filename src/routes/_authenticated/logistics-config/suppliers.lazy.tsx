import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsSupplierDirectoryTab } from '@/features/logistics-config/supplier-directory-tab'

export const Route = createLazyFileRoute('/_authenticated/logistics-config/suppliers')({
  component: LogisticsSupplierDirectoryTab,
})

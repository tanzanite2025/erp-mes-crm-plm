import { createLazyFileRoute } from '@tanstack/react-router'
import { SupplierMgmt } from '@/features/purchase/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/purchase/suppliers')({
  component: SupplierMgmt,
})

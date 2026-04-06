import { createLazyFileRoute } from '@tanstack/react-router'
import { CustomerMgmt } from '@/features/trading/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/trading/customers')({
  component: CustomerMgmt,
})

import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductInbound } from '@/features/warehouse/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/warehouse/inbound')({
  component: ProductInbound,
})

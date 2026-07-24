import { createFileRoute } from '@tanstack/react-router'
import { OutsourceOrderManagement } from '@/features/production-outsourcing/orders'

export const Route = createFileRoute(
  '/_authenticated/production-outsourcing/orders'
)({
  component: OutsourceOrderManagement,
})

import { createFileRoute } from '@tanstack/react-router'
import { OutsourcePartnerManagement } from '@/features/production-outsourcing/partners'

export const Route = createFileRoute(
  '/_authenticated/production-outsourcing/partners'
)({
  component: OutsourcePartnerManagement,
})

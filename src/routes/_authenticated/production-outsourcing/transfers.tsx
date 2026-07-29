import { createFileRoute } from '@tanstack/react-router'
import { OutsourceTransferManagement } from '@/features/production-outsourcing/transfers'

export const Route = createFileRoute(
  '/_authenticated/production-outsourcing/transfers'
)({
  component: OutsourceTransferManagement,
})

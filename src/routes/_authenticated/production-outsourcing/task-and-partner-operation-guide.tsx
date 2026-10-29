import { createFileRoute } from '@tanstack/react-router'
import { OutsourceTaskAndPartnerOperationGuidePage } from '@/features/production-outsourcing/pages/production-outsourcing-task-partner-and-scanning-operation-guide-pages'

export const Route = createFileRoute(
  '/_authenticated/production-outsourcing/task-and-partner-operation-guide'
)({
  component: OutsourceTaskAndPartnerOperationGuidePage,
})

import { createFileRoute } from '@tanstack/react-router'
import { OutsourceSendReturnInspectionScanningGuidePage } from '@/features/production-outsourcing/pages/production-outsourcing-task-partner-and-scanning-operation-guide-pages'

export const Route = createFileRoute(
  '/_authenticated/production-outsourcing/send-return-inspection-scanning-guide'
)({
  component: OutsourceSendReturnInspectionScanningGuidePage,
})

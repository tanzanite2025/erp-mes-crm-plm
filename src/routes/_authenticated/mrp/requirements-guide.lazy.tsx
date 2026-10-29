import { createLazyFileRoute } from '@tanstack/react-router'
import { PartRequirementsOperationGuidePage } from '@/features/mrp/pages/part-requirements-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/mrp/requirements-guide'
)({
  component: PartRequirementsOperationGuidePage,
})

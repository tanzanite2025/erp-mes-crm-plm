import { createLazyFileRoute } from '@tanstack/react-router'
import { QualityStandardCreationOperationGuidePage } from '@/features/quality/pages/quality-standard-creation-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/quality/standard-creation-guide'
)({ component: QualityStandardCreationOperationGuidePage })
